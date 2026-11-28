'use strict';
/* exported CrosshairsGroup */

const {Adw, Gdk, Gio, Gtk} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const Keys = Me.imports.lib.common.settingsKeys;
const {FALLBACK_COLOR, LINE_STYLES} = Me.imports.lib.ui.crosshairGeometry;
const {connectWhileAlive, hexColor, schemaRange} = Me.imports.preferences.util;
const {switchRow} = Me.imports.preferences.switchRow;

const {CROSSHAIRS} = Keys;

// The thickness slider's range (pixels); the key itself has no range.
const MAX_THICKNESS = 100;
const THICKNESS_RANGE = [1, MAX_THICKNESS];
const SCALE_WIDTH = 200;

// Pixels moved by Page Up / Page Down on a slider.
const SCALE_PAGE = 10;

// What the "Lines" row shows for each of LINE_STYLES.
const LINE_LABELS = {
    straight: 'Straight (+)',
    diagonal: 'Diagonal (×)',
    both: 'Both',
    none: 'None',
};

// The "Crosshairs" group. Most rows are GNOME's own crosshair settings, the
// ones GNOME Settings shows under Accessibility → Zoom, laid out the same way;
// changing them here changes them there too. The lines and circle rows are
// MultiZoom's own.
var CrosshairsGroup = class CrosshairsGroup {
    // own: MultiZoom's settings.
    constructor(own) {
        this._settings = new Gio.Settings({schema_id: Keys.MAGNIFIER_SCHEMA});
        this.group = new Adw.PreferencesGroup({
            title: 'Crosshairs',
            description: 'Lines and a circle through the pointer, to help find it',
        });

        this.group.add(switchRow(this._settings, CROSSHAIRS.SHOW, {title: 'Show crosshairs'}));

        const radius = this._radiusRow(own);

        const rows = [
            this._linesRow(own),
            switchRow(own, Keys.CROSSHAIR_CIRCLE, {title: 'Circle', subtitle: 'A ring around the pointer'}),
            radius,
            switchRow(this._settings, CROSSHAIRS.CLIP, {title: 'Overlap the pointer'},
                Gio.SettingsBindFlags.INVERT_BOOLEAN),
            this._scaleRow(this._settings, CROSSHAIRS.THICKNESS, 'Thickness', THICKNESS_RANGE),
            this._scaleRow(this._settings, CROSSHAIRS.LENGTH, 'Length'),
            this._colorRow(),
        ];

        // Greyed out while the crosshairs are off, as in GNOME Settings. The
        // radius row also depends on the circle, so it handles its own.
        for (const row of rows) {
            if (row !== radius)
                this._settings.bind(CROSSHAIRS.SHOW, row, 'sensitive', Gio.SettingsBindFlags.GET);

            this.group.add(row);
        }
    }

    // Greyed out unless both the crosshairs and the circle are on. A
    // binding can follow only one key, so this follows both by hand.
    _radiusRow(own) {
        const row = this._scaleRow(own, Keys.CROSSHAIR_CIRCLE_RADIUS, 'Circle radius');

        const update = () => {
            row.sensitive = this._settings.get_boolean(CROSSHAIRS.SHOW) && own.get_boolean(Keys.CROSSHAIR_CIRCLE);
        };

        connectWhileAlive(this._settings, `changed::${CROSSHAIRS.SHOW}`, update, row);
        connectWhileAlive(own, `changed::${Keys.CROSSHAIR_CIRCLE}`, update, row);
        update();

        return row;
    }

    // Straight, diagonal, both or none, kept in sync with the key both ways.
    _linesRow(own) {
        const row = new Adw.ComboRow({
            title: 'Lines',
            model: Gtk.StringList.new(LINE_STYLES.map(style => LINE_LABELS[style])),
        });

        const show = () => {
            row.selected = Math.max(0, LINE_STYLES.indexOf(own.get_string(Keys.CROSSHAIR_LINES)));
        };

        show();
        row.connect('notify::selected', () => own.set_string(Keys.CROSSHAIR_LINES, LINE_STYLES[row.selected]));
        connectWhileAlive(own, `changed::${Keys.CROSSHAIR_LINES}`, show, row);

        return row;
    }

    // A row with a slider bound to an `i` key (pixels). The range is the
    // key's own unless given.
    _scaleRow(settings, key, title, [min, max] = schemaRange(settings, key)) {
        const adjustment = new Gtk.Adjustment({lower: min, upper: max, step_increment: 1, page_increment: SCALE_PAGE});

        const scale = new Gtk.Scale({
            adjustment,
            digits: 0,
            draw_value: true,
            value_pos: Gtk.PositionType.LEFT,
            hexpand: true,
            width_request: SCALE_WIDTH,
            valign: Gtk.Align.CENTER,
        });

        const row = new Adw.ActionRow({title});

        row.add_suffix(scale);
        settings.bind(key, adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);

        return row;
    }

    // Colour and opacity are two keys but one colour button with alpha, as
    // in GNOME Settings.
    _colorRow() {
        const button = new Gtk.ColorButton({use_alpha: true, valign: Gtk.Align.CENTER});
        const row = new Adw.ActionRow({title: 'Colour', activatable_widget: button});

        const show = () => button.set_rgba(this._rgba());

        button.connect('color-set', () => {
            const rgba = button.get_rgba();

            this._settings.set_string(CROSSHAIRS.COLOR, hexColor(rgba));
            this._settings.set_double(CROSSHAIRS.OPACITY, rgba.alpha);
        });

        for (const key of [CROSSHAIRS.COLOR, CROSSHAIRS.OPACITY])
            connectWhileAlive(this._settings, `changed::${key}`, show, row);

        show();
        row.add_suffix(button);

        return row;
    }

    _rgba() {
        const rgba = new Gdk.RGBA();

        if (!rgba.parse(this._settings.get_string(CROSSHAIRS.COLOR)))
            rgba.parse(FALLBACK_COLOR);

        rgba.alpha = this._settings.get_double(CROSSHAIRS.OPACITY);

        return rgba;
    }
};
