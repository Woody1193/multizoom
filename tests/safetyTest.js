'use strict';

// Tests for lib/common/safety.js. Run all tests with `make test`.

const {guard, safely} = imports.lib.common.safety;
const {eq, ok} = imports.tests.harness;

// Run `fn` with logError captured instead of printed.
function withLoggedErrors(fn) {
    const logged = [];
    const original = globalThis.logError;

    globalThis.logError = (e, message) => logged.push({e, message});

    try {
        fn();
    } finally {
        globalThis.logError = original;
    }

    return logged;
}

// safely: a failing step is logged, not thrown.
{
    const failure = new Error('step failed');
    let ran = false;

    const logged = withLoggedErrors(() => {
        safely(() => {
            throw failure;
        });

        safely(() => {
            ran = true;
        });
    });

    eq(logged.length, 1, 'a failing step is logged once');
    ok(logged[0].e === failure, 'with its error');
    ok(ran, 'and the next step still runs');
}

// guard: passes arguments and results through; errors go to onError.
{
    const errors = [];
    const onError = e => errors.push(e);

    eq(guard((a, b) => a + b, onError)(2, 3), 5, 'passes arguments and returns the result');
    eq(errors.length, 0, 'no error reported on success');

    const failure = new Error('handler failed');

    const result = guard(() => {
        throw failure;
    }, onError)();

    eq(result, undefined, 'returns undefined when the handler throws');
    ok(errors[0] === failure, 'and reports the error');
}
