import { range } from 'lodash';
import CircuitBreaker, { CBErrOpenState } from '../src/cb';
import { CBState } from "../lib/cb";

const sleep = (milliSeconds: number) => {
    return new Promise(resolve => {
        setTimeout(resolve, milliSeconds);
    });
}

describe('CircuitBreaker', () => {
    test('default settings happy path', async () => {
        const cb = new CircuitBreaker({
            name: 'testBreaker',
        });
        expect(cb.name).toBe('testBreaker');
        try {
            const n = await cb.execute<number>(() => {
                return 5;
            });
            expect(n).toBe(5);
            expect(cb.toString()).toBe('closed');
        } catch (err) {
            expect(err).toBeUndefined();
        }
    });


    test('error path', async () => {
        const stateChangeMockFn = jest.fn();
        const cb = new CircuitBreaker({
            name: 'testBreaker',
            onStateChange: stateChangeMockFn,
            timeout: 500,
            maxRequests: 1,
            interval: 0,
            isSuccessful: (data) => {
                return !(data instanceof Error);
            },
            readyToTrip: (counts): boolean => {
                return counts.consecutiveFailures > 5;
            }
        });

        const mockError = new Error('there\'s no spoon');
        const mockErrorFn = jest.fn(() => {
            throw mockError;
        });
        const mockSuccessFn = jest.fn(() => {
            return 2;
        });

        const rows = range(1, 8);
        for (const row of rows) {
            if (row < 7) {
                await expect(cb.execute<number>(mockErrorFn)).rejects.toEqual(mockError);
            } else {
                await expect(cb.execute<number>(mockErrorFn)).rejects.toEqual(CBErrOpenState);
            }
        }

        expect(mockErrorFn.mock.calls.length).toBe(6);
        expect(stateChangeMockFn.mock.calls.length).toBe(1);
        expect(cb.toString()).toBe('open');

        // forward time so we get to half-open state
        await sleep(505);

        expect(cb.getState()).toBe(CBState.halfOpen);
        expect(cb.toString()).toBe('half-open');

        await expect(cb.execute<number>(mockSuccessFn)).resolves.toEqual(2);
        expect(stateChangeMockFn.mock.calls.length).toBe(3);
    });
});
