'use strict';
/* exported ZoomPage */

const {Adw, Gio, Gtk} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const Keys = Me.imports.lib.common.settingsKeys;
const {MonitorsGroup} = Me.imports.preferences.monitorsGroup;
const {PercentRow} = Me.imports.preferences.percentRow;
const {connectWhileAlive, schemaRange} = Me.imports.preferences.util;

// The "Zoom" page: on/off, default magnification, zoom step, and the
// remembered displays.
var ZoomPage = class ZoomPage {
    constructor(settings) {
        this.page = new Adw.PreferencesPage({title: 'Zoom', icon_name: 'zoom-in-symbolic'});

        const group = new Adw.PreferencesGroup({title: 'Zoom'});

        group.add(this._switchRow(settings, Keys.ACTIVE, {
            title: 'Zoom',
            subtitle: 'Magnify each display on its own',
        }));

        group.add(this._percentRow(settings, Keys.DEFAULT_ZOOM, {
            title: 'Default magnification',
            subtitle: 'For displays MultiZoom hasn\'t seen before',
        }));

        group.add(this._percentRow(settings, Keys.ZOOM_STEP, {
            title: 'Zoom step',
            subtitle: 'Added or removed by each zoom in or zoom out',
        }));

        group.add(this._smoothRow(settings));

        this.page.add(group);
        this.page.add(new MonitorsGroup(settings).group);
    }

    // A row with a switch bound to a `b` key.
    _switchRow(settings, key, text) {
        const toggle = new Gtk.Switch({valign: Gtk.Align.CENTER});
        const row = new Adw.ActionRow({...text, activatable_widget: toggle});

        row.add_suffix(toggle);
        settings.bind(key, toggle, 'active', Gio.SettingsBindFlags.DEFAULT);

        return row;
    }

    // Greyed out while the desktop's own animations are off, as MultiZoom
    // doesn't glide then either.
    _smoothRow(settings) {
        const row = this._switchRow(settings, Keys.SMOOTH_MOVEMENT, {
            title: 'Smooth movement',
            subtitle: 'Glide to keyboard focus, the text cursor and new zoom levels',
        });

        this._interface = new Gio.Settings({schema_id: Keys.INTERFACE_SCHEMA});
        this._interface.bind(Keys.ENABLE_ANIMATIONS, row, 'sensitive', Gio.SettingsBindFlags.GET);

        return row;
    }

    // A percent row kept in sync with a `d` key, both ways.
    _percentRow(settings, key, text) {
        const range = schemaRange(settings, key);
        const step = key === Keys.ZOOM_STEP ? range[0] : settings.get_double(Keys.ZOOM_STEP);

        const percentRow = new PercentRow({...text, range, step},
            settings.get_double(key),
            factor => settings.set_double(key, factor));

        connectWhileAlive(settings, `changed::${key}`,
            () => percentRow.setValue(settings.get_double(key)),
            percentRow.row);

        return percentRow.row;
    }
};
