'use strict';

// Tests for lib/monitorStates.js. Run all tests with `make test`.

const {MonitorStates} = imports.lib.monitorStates;
const {eq, ok} = imports.tests.harness;

const DEFAULT_ZOOM = 2;

// A store holding the saved zoom levels in memory.
function memoryStore(initial) {
    const store = {saved: {...initial}, saves: 0};

    store.load = () => ({...store.saved});

    store.save = zooms => {
        store.saved = {...zooms};
        store.saves++;
    };

    return store;
}

let created = 0;

function createState(monitor, savedZoom) {
    created++;

    return {monitor, zoom: savedZoom ?? DEFAULT_ZOOM};
}

const left = {x: 0, y: 0, width: 2560, height: 1080};
const right = {x: 2560, y: 0, width: 1920, height: 1080};

// Identity: one state object per geometry.
{
    const states = new MonitorStates(createState, memoryStore({}));
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
}

// Saving: each monitor keeps its own level across a restart.
{
    const store = memoryStore({});
    const before = new MonitorStates(createState, store);

    eq(before.get(left).zoom, DEFAULT_ZOOM, 'unsaved monitor starts at the default');
    before.get(left).zoom = 3;
    before.get(right).zoom = 1.5;
    before.saveZooms();
    eq(store.saves, 1, 'saveZooms writes once');

    const after = new MonitorStates(createState, store);

    eq(after.get(left).zoom, 3, 'left monitor zoom restored');
    eq(after.get(right).zoom, 1.5, 'right monitor zoom restored');
}

// Monitors not connected right now keep their saved level.
{
    const store = memoryStore({'2560,0,1920x1080': 5});
    const states = new MonitorStates(createState, store);

    states.get(left).zoom = 3;
    states.saveZooms();
    eq(store.saved['2560,0,1920x1080'], 5, 'unseen monitor keeps its saved zoom');
    eq(store.saved['0,0,2560x1080'], 3, 'seen monitor saved');
}
