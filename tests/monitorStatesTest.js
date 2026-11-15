'use strict';

// Tests for lib/monitors/monitorStates.js. Run all tests with `make test`.

const {MonitorStates} = imports.lib.monitors.monitorStates;
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

// Monitors as MonitorSet passes them: geometry plus id and place keys.
function monitorAt(x, width, id) {
    return {x, y: 0, width, height: 1080, id, place: `${x},0,${width}x1080`};
}

const left = monitorAt(0, 2560, 'edid:DEL:P3418HW:SERIAL');
const right = monitorAt(2560, 1920, 'edid:BOE:0x094a:eDP');

// Identity: one state object per geometry.
{
    const states = new MonitorStates(createState, memoryStore({}));
    const first = states.get(left);

    eq(first.monitor, left, 'factory receives the monitor');
    ok(states.get({...left}) === first, 'same id returns the same state object');
    eq(created, 1, 'factory runs once per monitor');

    ok(states.get({...left, x: 1920, place: 'moved'}) === first, 'same monitor elsewhere keeps its state');
    ok(states.get(right) !== first, 'different id is a different monitor');

    const unknown = states.get({...left, id: null});

    ok(unknown !== first, 'without an id, the state is keyed by place');
    ok(states.get({...left, id: null}) === unknown, 'same place returns the same state object');
    eq(created, 3, 'factory ran for each new key');

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
    const store = memoryStore({[right.id]: 5});
    const states = new MonitorStates(createState, store);

    states.get(left).zoom = 3;
    states.saveZooms();
    eq(store.saved[right.id], 5, 'unseen monitor keeps its saved zoom');
    eq(store.saved[left.id], 3, 'seen monitor saved under its id');
}

// Levels saved by geometry (before ids) are picked up under the new id.
{
    const store = memoryStore({[left.place]: 2.5});
    const states = new MonitorStates(createState, store);

    eq(states.get(left).zoom, 2.5, 'geometry-saved zoom used when the id has none');
    states.saveZooms();
    eq(store.saved[left.id], 2.5, 'and saved under the id from then on');
    ok(!(left.place in store.saved), 'the geometry entry is removed once migrated');
}

// The conference room: the same laptop panel, a different external display.
{
    const store = memoryStore({});
    const desk = new MonitorStates(createState, store);

    desk.get(left).zoom = 3;
    desk.get(right).zoom = 1.5;
    desk.saveZooms();

    const room = new MonitorStates(createState, store);
    const projector = monitorAt(1920, 1920, 'edid:SAM:TV:XYZ');
    const laptop = {...right, x: 0, place: '0,0,1920x1080'};

    eq(room.get(laptop).zoom, 1.5, 'laptop panel keeps its zoom in a new position');
    eq(room.get(projector).zoom, DEFAULT_ZOOM, 'new projector starts at the default');
}

// While Mutter hasn't answered, a monitor is kept by place; once its id is
// known, that fallback state isn't saved any more.
{
    const store = memoryStore({});
    const states = new MonitorStates(createState, store);

    states.get({...left, id: null});
    states.get(left);
    states.saveZooms();
    ok(!(left.place in store.saved), 'fallback state is not saved once the id is known');
    ok(left.id in store.saved, 'the id state is saved');
}

// A fallback saved later in the session (a second wait for Mutter) is
// cleaned up too.
{
    const store = memoryStore({});
    const states = new MonitorStates(createState, store);

    states.get(left);
    states.get({...left, id: null});
    states.saveZooms();
    ok(left.place in store.saved, 'fallback saved while waiting');
    states.get(left);
    states.saveZooms();
    ok(!(left.place in store.saved), 'and removed once the id is back');
}

// Levels changed in the preferences window reach the running states; our
// own saves don't count as changes.
{
    const store = memoryStore({});
    const states = new MonitorStates(createState, store);

    const setZoom = (state, zoom) => {
        state.zoom = zoom;
    };

    states.get(left).zoom = 3;
    states.get(right);
    states.saveZooms();
    ok(!states.reload(setZoom), 'reloading our own save changes nothing');

    store.saved = {...store.saved, [left.id]: 4};
    ok(states.reload(setZoom), 'a level changed elsewhere is a change');
    eq(states.get(left).zoom, 4, 'and is applied');

    const forgotten = states.get(right);

    store.saved = {[left.id]: 4};
    ok(states.reload(setZoom), 'forgetting a monitor is a change');
    ok(states.get(right) !== forgotten, 'a forgotten monitor gets a new state');
    eq(states.get(right).zoom, DEFAULT_ZOOM, 'at the default zoom');
}
