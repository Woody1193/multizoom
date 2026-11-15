'use strict';
/* exported FocusWatch */

const {Atspi} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {focusRect, caretRect} = Me.imports.lib.accessibleExtents;
const {guard} = Me.imports.lib.safety;

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

        const rectOf = event.type === CARET_MOVED ? caretRect : focusRect;
        const rect = this._read(event, window, rectOf);

        if (rect)
            this._onPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
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
