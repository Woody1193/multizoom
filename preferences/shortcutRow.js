'use strict';
/* exported ShortcutRow */

const {Adw, Gtk} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {findConflict} = Me.imports.preferences.shortcutConflicts;
const {ShortcutDialog} = Me.imports.preferences.shortcutDialog;
const {connectWhileAlive} = Me.imports.preferences.util;

// One shortcut in the list, as in GNOME Settings: its name, the keys on the
// right ("Disabled" if none), and a reset button once it's been changed.
// Activating the row opens the "Set Shortcut" dialog.
var ShortcutRow = class ShortcutRow {
    constructor(settings, key, sources) {
        this._settings = settings;
        this._key = key;
        this._sources = sources;
        this._title = settings.settings_schema.get_key(key).get_summary();

        this._keys = new Gtk.ShortcutLabel({disabled_text: 'Disabled', valign: Gtk.Align.CENTER});
        this._reset = new Gtk.Button({
            icon_name: 'edit-clear-symbolic',
            tooltip_text: 'Reset the shortcut to its default value',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat', 'circular'],
        });

        this.row = new Adw.ActionRow({title: this._title, activatable: true});
        this.row.add_suffix(this._keys);
        this.row.add_suffix(this._reset);

        this._reset.connect('clicked', () => settings.reset(key));
        this.row.connect('activated', () => this._edit());
        connectWhileAlive(settings, `changed::${key}`, () => this._update(), this.row);
        this._update();
    }

    _update() {
        const [accel = ''] = this._settings.get_strv(this._key);

        this._keys.accelerator = accel;
        this._reset.visible = this._settings.get_user_value(this._key) !== null;
    }

    _edit() {
        const ownId = `${this._settings.schema_id}/${this._key}`;

        new ShortcutDialog(this.row.get_root(), {
            title: this._title,
            conflictWith: accel => findConflict(accel, this._sources.bindings(), ownId),
            set: accels => this._settings.set_strv(this._key, accels),
            disable: id => this._sources.disable(id),
        }).show();
    }
};
