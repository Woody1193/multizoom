'use strict';
/* exported init */

const {Meta, Shell} = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Viewport = Me.imports.lib.viewport;
const {BuiltinMagnifier} = Me.imports.lib.builtinMagnifier;
const {MonitorStates} = Me.imports.lib.monitorStates;
const {ZoomSession} = Me.imports.lib.zoomSession;
const {guard, safely} = Me.imports.lib.safety;

const ACTIVE_KEY = 'active';
const DEFAULT_ZOOM_KEY = 'default-zoom';
const TOGGLE_ZOOM_KEY = 'toggle-zoom';

// Composition root: owns the settings, the keyboard shortcut and the
// fail-safe, and switches zoom on and off. The zooming itself is ZoomSession.
class MultiZoom {
    enable() {
        this._settings = ExtensionUtils.getSettings();
        this._session = null;
        this._onError = e => this._fail(e);

        const zoom = this._settings.get_double(DEFAULT_ZOOM_KEY);

        this._states = new MonitorStates(m => Viewport.newState(m, zoom));
        this._builtin = new BuiltinMagnifier(guard(() => this._stop(), this._onError));

        Main.wm.addKeybinding(TOGGLE_ZOOM_KEY, this._settings,
            Meta.KeyBindingFlags.NONE, Shell.ActionMode.ALL,
            guard(() => this._toggle(), this._onError));

        // Start only if the user left zoom on (e.g. before the screen locked).
        if (this._settings.get_boolean(ACTIVE_KEY))
            guard(() => this._start(), this._onError)();
    }

    disable() {
        const wasZooming = this._session !== null;

        safely(() => this._endSession());
        safely(() => Main.wm.removeKeybinding(TOGGLE_ZOOM_KEY));
        safely(() => this._builtin.release(wasZooming));

        this._builtin = null;
        this._states = null;
        this._settings = null;
    }

    _toggle() {
        if (this._session)
            this._stop();
        else
            this._start();
    }

    // Switch zoom on and remember that choice.
    _start() {
        this._builtin.takeOver();
        this._settings.set_boolean(ACTIVE_KEY, true);
        this._session = new ZoomSession(this._states, this._onError);
    }

    // Switch zoom off and remember that choice.
    _stop() {
        this._settings.set_boolean(ACTIVE_KEY, false);
        this._endSession();
    }

    _endSession() {
        const session = this._session;

        this._session = null;
        session?.destroy();
    }

    _fail(error) {
        logError(error, '[multizoom] error; switching to the built-in magnifier');
        safely(() => this._stop());

        // Never leave the user without zoom: hand over to GNOME's magnifier.
        safely(() => this._builtin.switchOn());
        safely(() => Main.notify('MultiZoom stopped',
            'It hit an error and switched to the built-in magnifier. Details are in the system journal.'));
    }
}

function init() {
    return new MultiZoom();
}
