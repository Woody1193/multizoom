'use strict';
/* exported init */

const {GLib, St} = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Keys = Me.imports.lib.common.settingsKeys;
const Viewport = Me.imports.lib.zoom.viewport;
const {BuiltinMagnifier} = Me.imports.lib.zoom.builtinMagnifier;
const {CrosshairSettings} = Me.imports.lib.ui.crosshairSettings;
const {Keybindings} = Me.imports.lib.input.keybindings;
const {MonitorIds} = Me.imports.lib.monitors.monitorIds;
const {MonitorStates} = Me.imports.lib.monitors.monitorStates;
const {ZoomSession} = Me.imports.lib.zoom.zoomSession;
const {guard, safely} = Me.imports.lib.common.safety;

const ZOOM_IN = 1;
const ZOOM_OUT = -1;

// Composition root: owns the settings, the keyboard shortcut and the
// fail-safe, and switches zoom on and off, also when the preferences window
// changes the settings. The zooming itself is ZoomSession.
class MultiZoom {
    enable() {
        this._settings = ExtensionUtils.getSettings();
        this._crosshairSettings = new CrosshairSettings(this._settings);
        this._session = null;
        this._onError = e => this._fail(e);

        this._states = new MonitorStates(
            (m, savedZoom) => Viewport.newState(m, savedZoom ?? this._defaultZoom()),
            this._zoomStore());

        this._ids = new MonitorIds(() => this._session?.refresh(), this._onError);
        this._builtin = new BuiltinMagnifier(guard(() => this._stop(), this._onError));

        this._keybindings = new Keybindings(this._settings, this._shortcutActions());
        this._watchSettings();

        // Start only if the user left zoom on (e.g. before the screen locked).
        if (this._settings.get_boolean(Keys.ACTIVE))
            guard(() => this._start(), this._onError)();
    }

    disable() {
        // GNOME disables extensions when the screen locks; the session is
        // already in lock-screen mode by then. Keep a zooming user zoomed at
        // the password prompt with the built-in magnifier. When the user
        // disables MultiZoom themselves, leave zoom off.
        const keepZoomed = this._session !== null && Main.sessionMode.isLocked;

        safely(() => this._settings.disconnectObject(this));
        safely(() => this._endSession());
        safely(() => this._keybindings.destroy());
        safely(() => this._builtin.release(keepZoomed));
        safely(() => this._ids.destroy());

        this._ids = null;
        this._keybindings = null;
        this._builtin = null;
        this._states = null;
        this._crosshairSettings = null;
        this._settings = null;
    }

    // Where MonitorStates saves each monitor's zoom level.
    _zoomStore() {
        return {
            load: () => this._settings.get_value(Keys.MONITOR_ZOOMS).deep_unpack(),
            save: zooms => this._settings.set_value(Keys.MONITOR_ZOOMS,
                new GLib.Variant(Keys.MONITOR_ZOOMS_TYPE, zooms)),
        };
    }

    // Whether views may glide: the user's choice, and never while the
    // desktop's own animations are off.
    _smooth() {
        return this._settings.get_boolean(Keys.SMOOTH_MOVEMENT) && St.Settings.get().enable_animations;
    }

    // Read when a monitor is first seen, so a new default applies at once.
    _defaultZoom() {
        return this._settings.get_double(Keys.DEFAULT_ZOOM);
    }

    // Follow changes made in the preferences window (or dconf).
    _watchSettings() {
        const guarded = fn => guard(fn, this._onError);

        this._settings.connectObject(
            `changed::${Keys.ACTIVE}`, guarded(() => this._onActiveChanged()),
            `changed::${Keys.MONITOR_ZOOMS}`, guarded(() => this._onZoomsChanged()),
            this);
    }

    // _start and _stop write the key after acting, so this is a no-op then.
    _onActiveChanged() {
        const active = this._settings.get_boolean(Keys.ACTIVE);

        if (active && !this._session)
            this._start();
        else if (!active && this._session)
            this._endSession();
    }

    // Levels changed or forgotten; our own saves change nothing here.
    _onZoomsChanged() {
        const changed = this._states.reload((state, zoom) => this._setZoom(state, zoom));

        if (changed)
            this._session?.refresh();
    }

    _setZoom(state, zoom) {
        if (this._session)
            this._session.setZoom(state, zoom);
        else
            state.zoom = Viewport.clampZoom(zoom);
    }

    // Handlers for each shortcut, keyed by its settings key. Everything but
    // on/off acts on a running session only.
    _shortcutActions() {
        const guarded = fn => guard(fn, this._onError);
        const step = () => this._settings.get_double(Keys.ZOOM_STEP);

        return {
            'toggle-zoom': guarded(() => this._toggle()),
            'zoom-in': guarded(() => this._session?.stepZoom(step(), ZOOM_IN)),
            'zoom-out': guarded(() => this._session?.stepZoom(step(), ZOOM_OUT)),
            'toggle-lock': guarded(() => this._session?.toggleLock()),
            'unlock-all': guarded(() => this._session?.unlockAll()),
        };
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
        this._session = new ZoomSession(this._states, m => this._ids.idOf(m), {
            smooth: () => this._smooth(),
            crosshairSettings: this._crosshairSettings,
            onError: this._onError,
        });

        this._settings.set_boolean(Keys.ACTIVE, true);
    }

    // Switch zoom off and remember that choice.
    _stop() {
        this._endSession();
        this._settings.set_boolean(Keys.ACTIVE, false);
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
