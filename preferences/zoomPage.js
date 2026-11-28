'use strict';
/* exported ZoomPage */

const {Adw, Gio} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const Keys = Me.imports.lib.common.settingsKeys;
const {CrosshairsGroup} = Me.imports.preferences.crosshairsGroup;
const {MonitorsGroup} = Me.imports.preferences.monitorsGroup;
const {PercentRow} = Me.imports.preferences.percentRow;
const {connectWhileAlive, schemaRange} = Me.imports.preferences.util;
const {switchRow} = Me.imports.preferences.switchRow;

// The "Zoom" page: on/off, default magnification, zoom step, crosshairs
// and the remembered displays.
var ZoomPage = class ZoomPage {
    constructor(settings) {
        this.page = new Adw.PreferencesPage({title: 'Zoom', icon_name: 'zoom-in-symbolic'});

        const group = new Adw.PreferencesGroup({title: 'Zoom'});

        group.add(switchRow(settings, Keys.ACTIVE, {
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
        this.page.add(new CrosshairsGroup(settings).group);
        this.page.add(new MonitorsGroup(settings).group);
    }

    // Greyed out while the desktop's own animations are off, as MultiZoom
    // doesn't glide then either.
    _smoothRow(settings) {
        const row = switchRow(settings, Keys.SMOOTH_MOVEMENT, {
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
