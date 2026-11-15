'use strict';
/* exported PointerWatch */

const {GLib} = imports.gi;

// About 60 Hz: the rate GNOME's magnifier polls at (ui/magnifier.js,
// startTrackingMouse).
const POLL_INTERVAL_MS = 16;

// Calls `callback(x, y)` with screen coordinates whenever the pointer moves.
//
// This has to poll. On X11 the shell gets no motion events while the pointer
// is over an application window, and the cursor tracker's
// `position-invalidated` signal never fired during testing on GNOME 42 / X11
// (2026-11-15), so there's no event to listen to instead.
var PointerWatch = class PointerWatch {
    constructor(callback) {
        this._callback = callback;
        this._lastX = NaN;
        this._lastY = NaN;

        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, POLL_INTERVAL_MS, () => {
            this._check();

            return GLib.SOURCE_CONTINUE;
        });

        GLib.Source.set_name_by_id(this._timeoutId, '[multizoom] pointer poll');
    }

    _check() {
        const [x, y] = global.get_pointer();

        if (x === this._lastX && y === this._lastY)
            return;

        this._lastX = x;
        this._lastY = y;
        this._callback(x, y);
    }

    // Report the current position even if it hasn't changed (e.g. after the
    // views were rebuilt).
    forceUpdate() {
        this._lastX = NaN;
        this._check();
    }

    destroy() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }

        this._callback = null;
    }
};
