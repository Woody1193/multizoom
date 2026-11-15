'use strict';
/* exported ShortcutSources */

const {Gio, GLib, Gtk} = imports.gi;

// Desktop shortcut schemas to check for clashes, as GNOME Settings' keyboard
// panel does, plus Pop!_OS's tiling shortcuts. Missing schemas are skipped.
const SYSTEM_SCHEMAS = [
    'org.gnome.desktop.wm.keybindings',
    'org.gnome.shell.keybindings',
    'org.gnome.mutter.keybindings',
    'org.gnome.mutter.wayland.keybindings',
    'org.gnome.settings-daemon.plugins.media-keys',
    'org.gnome.shell.extensions.pop-shell',
];

const STRING_LIST = new GLib.VariantType('as');
const STRING = new GLib.VariantType('s');

// Every shortcut on the desktop: MultiZoom's own and the system's, as
// bindings for preferences/shortcutConflicts.js, and a way to disable one ("Replace"
// in the conflict warning). Accelerators are normalised with Gtk so
// "<Alt><Super>z" and "<Super><Alt>Z" compare equal.
var ShortcutSources = class ShortcutSources {
    constructor(ownSettings) {
        const source = Gio.SettingsSchemaSource.get_default();

        this._settings = [ownSettings];

        for (const id of SYSTEM_SCHEMAS) {
            if (source.lookup(id, true))
                this._settings.push(new Gio.Settings({schema_id: id}));
        }
    }

    // [{id, title, accels}] for every key holding shortcuts.
    bindings() {
        return this._settings.flatMap(settings => keyBindings(settings));
    }

    // Remove every accelerator from binding `id` ("schema/key").
    disable(id) {
        const [schemaId, key] = id.split('/');
        const settings = this._settings.find(s => s.schema_id === schemaId);
        const type = settings.settings_schema.get_key(key).get_value_type();

        settings.set_value(key, type.equal(STRING) ? new GLib.Variant('s', '') : new GLib.Variant('as', []));
    }
};

function keyBindings(settings) {
    const schema = settings.settings_schema;

    return schema.list_keys().flatMap(key => {
        const accels = readAccels(settings, schema.get_key(key));

        if (accels === null)
            return [];

        return [{id: `${settings.schema_id}/${key}`, title: schema.get_key(key).get_summary() ?? key, accels}];
    });
}

// Normalised accelerators of a shortcut key, or null if it isn't one.
function readAccels(settings, schemaKey) {
    const type = schemaKey.get_value_type();
    const name = schemaKey.get_name();
    let values;

    if (type.equal(STRING_LIST))
        values = settings.get_strv(name);
    else if (type.equal(STRING))
        values = [settings.get_string(name)];
    else
        return null;

    return values.map(normalise).filter(Boolean);
}

// Gtk's canonical name for an accelerator, or null if it isn't one.
function normalise(accel) {
    const [ok, keyval, mods] = Gtk.accelerator_parse(accel);

    return ok && keyval !== 0 ? Gtk.accelerator_name(keyval, mods) : null;
}
