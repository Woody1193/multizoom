'use strict';
/* exported CrosshairSettings */

const {Gio} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const Keys = Me.imports.lib.common.settingsKeys;

const {CROSSHAIRS} = Keys;
const OWN_KEYS = [Keys.CROSSHAIR_LINES, Keys.CROSSHAIR_CIRCLE, Keys.CROSSHAIR_CIRCLE_RADIUS];

// Everything the crosshairs are drawn from, in one place: GNOME's own
// crosshair settings (shared with GNOME Settings) and MultiZoom's lines and
// circle. Reads them and reports when they change; drawing is Crosshairs'.
var CrosshairSettings = class CrosshairSettings {
    // own: MultiZoom's settings.
    constructor(own) {
        this._own = own;
        this._gnome = new Gio.Settings({schema_id: Keys.MAGNIFIER_SCHEMA});
    }

    // The current values. Sizes are in screen pixels; color is the string
    // GNOME stores ('#ff0000', 'red', …); lines is one of
    // crosshairGeometry.LINE_STYLES.
    read() {
        const gnome = this._gnome;
        const own = this._own;

        return {
            show: gnome.get_boolean(CROSSHAIRS.SHOW),
            color: gnome.get_string(CROSSHAIRS.COLOR),
            opacity: gnome.get_double(CROSSHAIRS.OPACITY),
            thickness: gnome.get_int(CROSSHAIRS.THICKNESS),
            length: gnome.get_int(CROSSHAIRS.LENGTH),
            clip: gnome.get_boolean(CROSSHAIRS.CLIP),
            lines: own.get_string(Keys.CROSSHAIR_LINES),
            circle: own.get_boolean(Keys.CROSSHAIR_CIRCLE),
            radius: own.get_int(Keys.CROSSHAIR_CIRCLE_RADIUS),
        };
    }

    // Call onChange() whenever one of the crosshair keys changes, until
    // disconnect(owner). Only those keys: MultiZoom saves zoom levels while
    // zooming, and that shouldn't redraw the crosshairs each time.
    connect(onChange, owner) {
        const watch = (settings, keys) =>
            settings.connectObject(...keys.flatMap(key => [`changed::${key}`, onChange]), owner);

        watch(this._gnome, Object.values(CROSSHAIRS));
        watch(this._own, OWN_KEYS);
    }

    disconnect(owner) {
        this._gnome.disconnectObject(owner);
        this._own.disconnectObject(owner);
    }
};
