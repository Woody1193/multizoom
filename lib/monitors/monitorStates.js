'use strict';
/* exported MonitorStates */

// Zoom state per monitor, kept for the life of the extension, so a monitor
// keeps its zoom and lock when monitors are rebuilt or zoom is switched off
// and on. Zoom levels are also saved through `store`, so they survive the
// extension being disabled (screen lock), GNOME Shell restarting, and the
// monitor being unplugged and plugged back in elsewhere. Lock isn't saved: a
// frozen view coming back after a restart would be confusing.
//
// Each monitor comes with two keys, see lib/monitors/monitorIdentity.js:
//   id:    the physical monitor (EDID), or null until Mutter has answered;
//   place: its geometry, the fallback, and how levels were saved before ids.
//
// No `gi` imports and no module imports (dependencies are injected), so it
// runs under plain `gjs` for the unit tests.
var MonitorStates = class MonitorStates {
    // createState(monitor, savedZoom): the initial state for a monitor seen
    //     for the first time; savedZoom is undefined if none was saved.
    // store: {load() → {key: zoom}, save({key: zoom})}.
    constructor(createState, store) {
        this._createState = createState;
        this._store = store;
        this._saved = store.load();
        this._byKey = new Map();
    }

    // The state for `monitor` ({x, y, width, height, id, place}); the same
    // object every time for the same key.
    get(monitor) {
        const key = monitor.id ?? monitor.place;

        // A level saved by geometry (before ids, or while waiting for
        // Mutter) is the fallback for a monitor seen for the first time.
        if (!this._byKey.has(key)) {
            const savedZoom = this._saved[key] ?? this._saved[monitor.place];

            this._byKey.set(key, this._createState(monitor, savedZoom));
        }

        // Once the monitor is known by id, whatever was kept by its place
        // is stale; drop it so it isn't saved again.
        if (monitor.id !== null) {
            this._byKey.delete(monitor.place);
            delete this._saved[monitor.place];
        }

        return this._byKey.get(key);
    }

    // Pick up levels changed elsewhere (the preferences window). Calls
    // setZoom(state, zoom) for each known monitor whose saved level differs,
    // and drops monitors that were forgotten, so they start again at the
    // default zoom the next time they're seen. Our own saves change nothing.
    // Returns whether anything changed; if so, get() every monitor again.
    reload(setZoom) {
        let changed = false;

        this._saved = this._store.load();

        for (const [key, state] of this._byKey) {
            const zoom = this._saved[key];

            if (zoom === state.zoom)
                continue;

            if (zoom === undefined)
                this._byKey.delete(key);
            else
                setZoom(state, zoom);

            changed = true;
        }

        return changed;
    }

    // Save every known monitor's zoom level; call after changing one.
    // Monitors saved earlier but not seen since are kept.
    saveZooms() {
        for (const [key, state] of this._byKey)
            this._saved[key] = state.zoom;

        this._store.save(this._saved);
    }
};
