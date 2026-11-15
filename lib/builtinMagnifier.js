'use strict';
/* exported BuiltinMagnifier */

const {Gio} = imports.gi;

const A11Y_SCHEMA = 'org.gnome.desktop.a11y.applications';
const ENABLED_KEY = 'screen-magnifier-enabled';

// GNOME's own magnifier. Two magnifiers at once fight over the cursor and the
// desktop's opacity, so MultiZoom switches it off while zooming.
//
// The user switching it on (Super+Alt+8) is the escape hatch, so
// `onSwitchedOn` fires and MultiZoom steps aside.
var BuiltinMagnifier = class BuiltinMagnifier {
    constructor(onSwitchedOn) {
        this._onSwitchedOn = onSwitchedOn;
        this._settings = new Gio.Settings({schema_id: A11Y_SCHEMA});
        this._settings.connectObject(`changed::${ENABLED_KEY}`, () => this._onChanged(), this);
    }

    // Switch it off so MultiZoom can zoom.
    takeOver() {
        this._settings.set_boolean(ENABLED_KEY, false);
    }

    // Switch it on, e.g. as the fallback when MultiZoom fails.
    switchOn() {
        this._settings.set_boolean(ENABLED_KEY, true);
    }

    // Stop watching. With `switchOn`, leave the built-in magnifier on, so a
    // user who had zoom on stays zoomed (e.g. at the lock screen, where
    // GNOME disables extensions).
    release(switchOn) {
        this._settings.disconnectObject(this);

        if (switchOn)
            this.switchOn();

        this._settings = null;
        this._onSwitchedOn = null;
    }

    _onChanged() {
        if (this._settings.get_boolean(ENABLED_KEY))
            this._onSwitchedOn();
    }
};
