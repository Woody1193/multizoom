'use strict';
/* exported MonitorStates */

// Zoom state per monitor, kept for the life of the extension, so a monitor
// keeps its zoom (and later its lock) when monitors are rebuilt or zoom is
// switched off and on.
//
// Keyed by geometry: GNOME 42 gives extensions no stable monitor id. No `gi`
// imports and no module imports (`createState` is injected), so it runs
// under plain `gjs` for the unit tests.
var MonitorStates = class MonitorStates {
    // createState(monitor) makes the initial state for a monitor seen for the
    // first time.
    constructor(createState) {
        this._createState = createState;
        this._byKey = new Map();
    }

    // The state for `monitor` ({x, y, width, height}); the same object every
    // time for the same geometry.
    get(monitor) {
        const key = `${monitor.x},${monitor.y},${monitor.width}x${monitor.height}`;

        if (!this._byKey.has(key))
            this._byKey.set(key, this._createState(monitor));

        return this._byKey.get(key);
    }
};
