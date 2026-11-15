'use strict';
/* exported MonitorsGroup */

const {Adw, Gio, GLib, Gtk} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const Keys = Me.imports.lib.common.settingsKeys;
const {monitorId} = Me.imports.lib.monitors.monitorIdentity;
const {monitorLabel} = Me.imports.lib.monitors.monitorLabel;
const {PercentRow} = Me.imports.preferences.percentRow;
const {connectWhileAlive, schemaRange} = Me.imports.preferences.util;

const DISPLAY_CONFIG = 'org.gnome.Mutter.DisplayConfig';
const DISPLAY_CONFIG_PATH = '/org/gnome/Mutter/DisplayConfig';
const NO_TIMEOUT = -1;
const MIRROR_SEPARATOR = '+';

// The "Displays" group: every display MultiZoom remembers a magnification
// for, whether it's connected, its magnification, and a button to forget
// it. Edits go to the monitor-zooms key; the running extension applies them.
var MonitorsGroup = class MonitorsGroup {
    constructor(settings) {
        this._settings = settings;
        this._rows = new Map();
        this._connected = new Set();

        this.group = new Adw.PreferencesGroup({
            title: 'Displays',
            description: 'Each display remembers its own magnification. ' +
                'Forget a display to start it at the default magnification next time.',
        });

        this._empty = new Adw.ActionRow({title: 'No displays remembered yet'});
        this.group.add(this._empty);

        connectWhileAlive(settings, `changed::${Keys.MONITOR_ZOOMS}`, () => this._update(), this.group);
        this._update();
        this._queryConnected();
    }

    _zooms() {
        return this._settings.get_value(Keys.MONITOR_ZOOMS).deep_unpack();
    }

    _write(zooms) {
        this._settings.set_value(Keys.MONITOR_ZOOMS, new GLib.Variant(Keys.MONITOR_ZOOMS_TYPE, zooms));
    }

    // Add, remove and refresh rows to match the saved levels.
    _update() {
        const zooms = this._zooms();

        for (const [key, row] of this._rows) {
            if (!(key in zooms)) {
                this.group.remove(row.row);
                this._rows.delete(key);
            }
        }

        for (const [key, zoom] of Object.entries(zooms)) {
            if (!this._rows.has(key))
                this._addRow(key, zoom);

            this._rows.get(key).setValue(zoom);
        }

        this._empty.visible = this._rows.size === 0;
        this._showConnected();
    }

    _addRow(key, zoom) {
        const label = monitorLabel(key);

        const percentRow = new PercentRow({
            title: label.title,
            subtitle: label.subtitle,
            range: schemaRange(this._settings, Keys.DEFAULT_ZOOM),
            step: this._settings.get_double(Keys.ZOOM_STEP),
        }, zoom, factor => this._write({...this._zooms(), [key]: factor}));

        const forget = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: 'Forget this display',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
        });

        forget.connect('clicked', () => this._forget(key));
        percentRow.row.add_suffix(forget);
        percentRow.labelSubtitle = label.subtitle;
        this.group.add(percentRow.row);
        this._rows.set(key, percentRow);
    }

    _forget(key) {
        const zooms = this._zooms();

        delete zooms[key];
        this._write(zooms);
    }

    // Mark rows for connected displays. Ids of mirrored displays are joined
    // with "+"; they count as connected if any part is.
    _showConnected() {
        for (const [key, percentRow] of this._rows) {
            const connected = key.split(MIRROR_SEPARATOR).some(id => this._connected.has(id));
            const parts = [percentRow.labelSubtitle, connected ? 'Connected' : ''].filter(Boolean);

            percentRow.row.subtitle = parts.join(' · ');
        }
    }

    // Ask Mutter which displays are connected, without blocking the window.
    _queryConnected() {
        Gio.DBus.session.call(DISPLAY_CONFIG, DISPLAY_CONFIG_PATH, DISPLAY_CONFIG, 'GetCurrentState',
            null, null, Gio.DBusCallFlags.NONE, NO_TIMEOUT, null, (bus, result) => {
                try {
                    const [, monitors] = bus.call_finish(result).deep_unpack();

                    this._connected = new Set(monitors.map(([spec]) => monitorId(spec)));
                    this._showConnected();
                } catch (e) {
                    log(`[multizoom] couldn't read connected displays: ${e.message}`);
                }
            });
    }
};
