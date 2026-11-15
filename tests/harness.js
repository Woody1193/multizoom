'use strict';
/* exported eq, ok, summary */

// Shared assertions for the unit tests. tests/run.js loads every test file
// and reports the summary.

const NUMBER_TOLERANCE = 1e-9;

const results = {count: 0, failures: 0};

function record(passed, message) {
    results.count++;

    if (!passed) {
        results.failures++;
        print(`FAIL ${message}`);
    }
}

// Numbers are compared with a small tolerance; anything else with ===.
function eq(actual, expected, name) {
    const passed = typeof expected === 'number'
        ? Math.abs(actual - expected) <= NUMBER_TOLERANCE
        : actual === expected;

    record(passed, `${name}: expected ${expected}, got ${actual}`);
}

function ok(condition, name) {
    record(Boolean(condition), name);
}

// {count, failures} so far.
function summary() {
    return {...results};
}
