# Circuit Breaker

Simple [circuit breaker](https://martinfowler.com/bliki/CircuitBreaker.html) written in TypeScript. Port of [gobreaker](https://github.com/sony/gobreaker). No dependencies.

[![codecov](https://codecov.io/gh/gyoridavid/circuit-breaker/branch/main/graph/badge.svg?token=2BM4L6PGKC)](https://codecov.io/gh/gyoridavid/circuit-breaker)
[![jest](https://jestjs.io/img/jest-badge.svg)](https://github.com/facebook/jest)


## Install

```bash

    npm i -S @gyoridavid/circuit-breaker

```

## Usage

```typescript

    import CircuitBreaker from '@gyoridavid/circuit-breaker';

    const breaker = new CircuitBreaker({
        name: 'http-client breaker'
    });

    interface HTTPResponse {
        status: number,
        body: any
    }

    try {
        const response: HTTPResponse = breaker.execute<HTTPResponse>(async () => {
            // async call that could fail
            return { status: 200, body: { status: 'ok' } };
        });
    } catch(err: error) {
        // check the error type
        // if breaker is open it'll throw CBErrOpenState
        // if breaker is half-open and we exceeded the maxRequests it'll throw CBErrTooManyRequests
    }

```

## Configuration

```typescript

// the following configuration options are available
interface CBConfig {
    name: string;
    interval?: number; // cyclic period of the closed state for the circuit breaker to clear the internal counts. If interval is less than or equal to 0, the circuit breaker doesn't clear internal counts during the closed state.
    isSuccessful?: (err: unknown) => boolean; // to check if we consider the given call as a failure; the method receives either the error or the response data.
    maxRequests?: number; // the number of requests to try in the half-open state
    onStateChange?: (name: string, from: CBState, to: CBState) => void; // called whenever the internal state changes; add logging/stats collection
    readyToTrip?: (counts: CBCount) => boolean; // configure when we should put the circuit breaker to open state; the default behaviour is after 5 failed calls.
    timeout?: number; // for how long we should wait until we put the circuit breaker to half-open state and re-try the call.
}

```
