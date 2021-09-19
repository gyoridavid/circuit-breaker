export default class CBCount {
    public requests: number = 0;
    public totalSuccesses: number = 0;
    public totalFailures: number = 0;
    public consecutiveSuccesses: number = 0;
    public consecutiveFailures: number = 0;

    onRequest() {
        this.requests++;
    }

    onSuccess() {
        this.totalSuccesses++;
        this.consecutiveSuccesses++;
        this.consecutiveFailures = 0;
    }

    onFailure() {
        this.totalFailures++;
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;
    }

    clear() {
        this.requests = 0;
        this.totalSuccesses = 0;
        this.totalFailures = 0;
        this.consecutiveSuccesses = 0;
        this.consecutiveFailures = 0;
    }
}
