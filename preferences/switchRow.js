'use strict';
/* exported switchRow */

const {Adw, Gio, Gtk} = imports.gi;

// A row with a switch bound to a `b` key. `flags` adds to the binding, e.g.
// INVERT_BOOLEAN for a key that means the opposite of the row's wording.
function switchRow(settings, key, text, flags = Gio.SettingsBindFlags.DEFAULT) {
    const toggle = new Gtk.Switch({valign: Gtk.Align.CENTER});
    const row = new Adw.ActionRow({...text, activatable_widget: toggle});

    row.add_suffix(toggle);
    settings.bind(key, toggle, 'active', flags);

    return row;
}
