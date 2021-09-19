import CBCount from './cbCount';

export enum CBState {
    closed,
    halfOpen,
    open,
}

interface CBConfig {
    name: string;
    interval?: number;
    isSuccessful?: (err: unknown) => boolean;
    maxRequests?: number;
    onStateChange?: (name: string, from: CBState, to: CBState) => void;
    readyToTrip?: (counts: CBCount) => boolean;
    timeout?: number;
}

export const CBErrTooManyRequests = new Error('too many requests');
export const CBErrOpenState = new Error('circuit breaker is open');

export default class CB {
    public name: string;
    private state: CBState = 0;
    private generation: number = 0;
    private counts: CBCount = new CBCount();
    private expiry: number = 0;
    private maxRequests: number = 1;
    private interval: number = 0;
    private timeout: number = 60000;

    private readyToTrip: (counts: CBCount) => boolean = (counts: CBCount): boolean => {
        return counts.consecutiveFailures > 5;
    };
    private onStateChange?: (name: string, from: CBState, to: CBState) => void;
    private isSuccessful: (data: unknown) => boolean = (data: unknown) => {
        return data instanceof Error;
    };

    constructor(config: CBConfig) {
        this.name = config.name;
        this.onStateChange = config.onStateChange;

        if (config.maxRequests && config.maxRequests > 0) {
            this.maxRequests = config.maxRequests;
        }

        if (config.interval && config.interval > 0) {
            this.interval = config.interval;
        }

        if (config.timeout && config.timeout > 0) {
            this.timeout = config.timeout;
        }

        if (config.readyToTrip) {
            this.readyToTrip = config.readyToTrip;
        }

        if (config.isSuccessful) {
            this.isSuccessful = config.isSuccessful;
        }

        this.toNewGeneration(Date.now());
    }

    toNewGeneration(date: number) {
        this.generation++;
        this.counts.clear();

        switch (this.state) {
            case CBState.closed:
                if (this.interval === 0) {
                    this.expiry = 0;
                } else {
                    this.expiry = date + this.interval;
                }
                break;
            case CBState.open:
                this.expiry = date + this.interval;
                break;
            default:
                this.expiry = 0;
        }
    }

    toString(): string {
        switch (this.state) {
            case CBState.closed:
                return 'closed';
            case CBState.halfOpen:
                return 'half-open';
            case CBState.open:
                return 'open';
            default:
                return `unknown state: ${this.state}`;
        }
    }

    async execute<T>(fn: () => T): Promise<T> {
        const [generation, err] = this.beforeRequest();
        if (err) {
            throw err;
        }
        try {
            const result = fn();
            this.afterRequest(generation as number, this.isSuccessful(result));
            return result;
        } catch (error: unknown) {
            this.afterRequest(generation as number, false);
            throw error;
        }
    }

    beforeRequest(): (number | Error)[] {
        const now = Date.now();
        const [state, generation] = this.currentState(now);
        if (state === CBState.open) {
            return [generation, CBErrOpenState];
        } else if (state === CBState.halfOpen && this.counts.requests >= this.maxRequests) {
            return [generation, CBErrTooManyRequests];
        }

        this.counts.onRequest();
        return [generation];
    }

    afterRequest(before: number, success: boolean) {
        const now = Date.now();
        const [state, generation] = this.currentState(now);
        if (generation !== before) {
            return;
        }
        if (success) {
            this.onSuccess(state, now);
        } else {
            this.onFailure(state, now);
        }
    }

    onSuccess(state: CBState, date: number) {
        switch (state) {
            case CBState.closed:
                this.counts.onSuccess();
                break;
            case CBState.halfOpen:
                this.counts.onSuccess();
                if (this.counts.consecutiveSuccesses >= this.maxRequests) {
                    this.setState(CBState.closed, date);
                }
        }
    }

    onFailure(state: CBState, date: number) {
        switch (state) {
            case CBState.closed:
                this.counts.onFailure();
                if (this.readyToTrip(this.counts)) {
                    this.setState(CBState.open, date);
                }
                break;
            case CBState.halfOpen:
                this.setState(CBState.open, date);
        }
    }

    setState(state: CBState, date: number) {
        if (this.state === state) {
            return;
        }
        const prev = this.state;
        this.state = state;

        this.toNewGeneration(date);

        if (this.onStateChange) {
            this.onStateChange(this.name, prev, state);
        }
    }

    getState(): CBState {
        const [state] = this.currentState(Date.now());
        return state;
    }

    currentState(date: number): (CBState | number)[] {
        switch (this.state) {
            case CBState.closed:
                if (this.expiry > 0 && this.expiry < date) {
                    this.toNewGeneration(date);
                }
                break;
            case CBState.open:
                if (date > this.expiry) {
                    this.setState(CBState.halfOpen, date);
                }
        }
        return [this.state, this.generation];
    }
}
