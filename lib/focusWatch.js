'use strict';
/* exported FocusWatch */

const {FocusCaretTracker} = imports.ui.focusCaretTracker;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {focusRect, caretRect} = Me.imports.lib.accessibleExtents;
const {guard} = Me.imports.lib.safety;

// Reports where keyboard focus and the text cursor go, as screen points.
//
// wants(monitorIndex): cheap check, called first with the monitor of the
//     focused window. Return false and no AT-SPI call is made, since those
//     block the shell (e.g. the monitor is locked or not zoomed).
// onPoint(x, y): the centre of the focused widget or of the character at
//     the text cursor, in screen pixels.
// onError(e): called if a handler fails. Failed AT-SPI lookups are not
//     errors; they are logged and skipped.
var FocusWatch = class FocusWatch {
    constructor(wants, onPoint, onError) {
        this._wants = wants;
        this._onPoint = onPoint;
        this._tracker = new FocusCaretTracker();

        this._handlerIds = [
            this._tracker.connect('focus-changed', guard((_t, e) => this._onEvent(e, focusRect), onError)),
            this._tracker.connect('caret-moved', guard((_t, e) => this._onEvent(e, caretRect), onError)),
        ];

        this._tracker.registerFocusListener();
        this._tracker.registerCaretListener();
    }

    destroy() {
        for (const id of this._handlerIds)
            this._tracker.disconnect(id);

        this._tracker.deregisterFocusListener();
        this._tracker.deregisterCaretListener();
        this._handlerIds = [];
        this._wants = null;
        this._onPoint = null;
    }

    // rectOf(event, window): focusRect or caretRect.
    _onEvent(event, rectOf) {
        const window = global.display.focus_window;

        if (!window || !this._wants(window.get_monitor()))
            return;

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
