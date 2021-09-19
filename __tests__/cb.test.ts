import { range } from 'lodash';
import CircuitBreaker, { CBErrOpenState } from '../src/cb';

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
        } catch (err) {
            expect(err).toBeUndefined();
        }
    });


    test('default settings error path', async () => {
        const stateChangeMockFn = jest.fn();
        const cb = new CircuitBreaker({
            name: 'testBreaker',
            onStateChange: stateChangeMockFn,
        });

        const mockError = new Error('there\'s no spoon');
        const mockErrorFn = jest.fn(() => {
            throw mockError;
        });

        for (const row of range(1, 10)) {
            if (row < 7) {
                await expect(cb.execute<number>(mockErrorFn)).rejects.toEqual(mockError);
            } else {
                await expect(cb.execute<number>(mockErrorFn)).rejects.toEqual(CBErrOpenState);
            }
        }

        expect(mockErrorFn.mock.calls.length).toBe(6);
        expect(stateChangeMockFn.mock.calls.length).toBe(1);
    });
});
