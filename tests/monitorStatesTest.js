'use strict';

// Tests for lib/monitorStates.js. Run all tests with `make test`.

const {MonitorStates} = imports.lib.monitorStates;
const {eq, ok} = imports.tests.harness;

let created = 0;

const states = new MonitorStates(monitor => {
    created++;

    return {monitor};
});

const left = {x: 0, y: 0, width: 2560, height: 1080};
const first = states.get(left);

eq(first.monitor, left, 'factory receives the monitor');
ok(states.get({...left}) === first, 'same geometry returns the same state object');
eq(created, 1, 'factory runs once per geometry');

ok(states.get({...left, x: 2560}) !== first, 'different position is a different monitor');
ok(states.get({...left, width: 1920}) !== first, 'different size is a different monitor');
eq(created, 3, 'factory ran for each new geometry');

// State changes stick: zoom survives the views being rebuilt.
first.zoom = 4;
eq(states.get({...left}).zoom, 4, 'mutations are kept');
