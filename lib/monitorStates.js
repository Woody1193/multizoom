'use strict';
/* exported MonitorStates */

// Zoom state per monitor, kept for the life of the extension, so a monitor
// keeps its zoom and lock when monitors are rebuilt or zoom is switched off
// and on. Zoom levels are also saved through `store`, so they survive the
// extension being disabled (screen lock) and GNOME Shell restarting. Lock
// isn't saved: a frozen view coming back after a restart would be confusing.
//
// Keyed by geometry: GNOME 42 gives extensions no stable monitor id. No `gi`
// imports and no module imports (dependencies are injected), so it runs
// under plain `gjs` for the unit tests.
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

    // The state for `monitor` ({x, y, width, height}); the same object every
    // time for the same geometry.
    get(monitor) {
        const key = `${monitor.x},${monitor.y},${monitor.width}x${monitor.height}`;

        if (!this._byKey.has(key))
            this._byKey.set(key, this._createState(monitor, this._saved[key]));

        return this._byKey.get(key);
    }

    // Save every known monitor's zoom level; call after changing one.
    // Monitors saved earlier but not seen since are kept.
    saveZooms() {
        for (const [key, state] of this._byKey)
            this._saved[key] = state.zoom;

        this._store.save(this._saved);
    }
};
