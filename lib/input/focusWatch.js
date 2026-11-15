'use strict';
/* exported FocusWatch */

const {Atspi} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {focusRect, caretRect} = Me.imports.lib.input.accessibleExtents;
const {guard} = Me.imports.lib.common.safety;

// AT-SPI events, as GNOME's ui/focusCaretTracker.js listens to them.
const STATE_CHANGED = 'object:state-changed';
const CARET_MOVED = 'object:text-caret-moved';

const EVENTS = [
    `${STATE_CHANGED}:focused`,
    `${STATE_CHANGED}:selected`,
    CARET_MOVED,
];

// Longest wait for an application to answer, as GNOME's magnifier sets it.
const ATSPI_TIMEOUT_MS = 250;

// Reports where keyboard focus and the text cursor go, as screen points.
//
// wants(monitorIndex): cheap check, called first with the monitor of the
//     focused window. Return false and no AT-SPI call is made, since those
//     block the shell (e.g. the monitor is locked or not zoomed).
// onPoint(x, y): the centre of the focused widget or of the character at
//     the text cursor, in screen pixels.
// onError(e): called if a handler fails. Failed AT-SPI lookups are not
//     errors; they are logged and skipped.
//
// Doesn't use GNOME's FocusCaretTracker: it treats Atspi.init() returning 1
// ("already initialised") as failure and then silently listens to nothing,
// so focus following broke from the second zoom session on.
var FocusWatch = class FocusWatch {
    constructor(wants, onPoint, onError) {
        this._wants = wants;
        this._onPoint = onPoint;

        // Last point reported for each kind of event. Our own shortcuts grab
        // the keyboard, and when they let go the application re-announces
        // the same focus; only a change of position may move a view, as in
        // GNOME's magnifier (ZoomRegion._updateFocus).
        this._focus = {rectOf: focusRect, x: NaN, y: NaN};
        this._caret = {rectOf: caretRect, x: NaN, y: NaN};

        // 0 = initialised now, 1 = already initialised; both are fine.
        Atspi.init();
        Atspi.set_timeout(ATSPI_TIMEOUT_MS, ATSPI_TIMEOUT_MS);

        this._listener = Atspi.EventListener.new(guard(e => this._onEvent(e), onError));

        for (const name of EVENTS)
            this._listener.register(name);
    }

    destroy() {
        for (const name of EVENTS)
            this._listener.deregister(name);

        this._listener = null;
        this._wants = null;
        this._onPoint = null;
    }

    _onEvent(event) {
        const window = global.display.focus_window;

        if (!window || !this._wants(window.get_monitor()))
            return;

        const kind = event.type === CARET_MOVED ? this._caret : this._focus;
        const rect = this._read(event, window, kind.rectOf);

        if (!rect)
            return;

        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height / 2;

        if (x === kind.x && y === kind.y)
            return;

        kind.x = x;
        kind.y = y;
        this._onPoint(x, y);
    }

    // Applications can be slow, busy or gone; that is not our failure.
    _read(event, window, rectOf) {
        try {
            return rectOf(event, window);
        } catch (e) {
            log(`[multizoom] couldn't read focus position: ${e.message}`);

            return null;
        }
    }
};
