'use strict';
/* exported PercentRow */

const {Adw, Gtk} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {PERCENT} = Me.imports.preferences.util;

// A settings row with a whole-percent spin button, e.g. "Default
// magnification  [200] %". Values in and out are factors (2.0 = 200%).
//
// options: {title, subtitle, range: [min, max] factors, step: factor}
// onChange(factor): called when the user changes the value.
var PercentRow = class PercentRow {
    constructor(options, value, onChange) {
        const [min, max] = options.range;

        this._spin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: Math.round(min * PERCENT),
                upper: Math.round(max * PERCENT),
                step_increment: Math.round(options.step * PERCENT),
                page_increment: Math.round(options.step * PERCENT),
            }),
            numeric: true,
            valign: Gtk.Align.CENTER,
        });

        this.row = new Adw.ActionRow({title: options.title, subtitle: options.subtitle ?? ''});
        this.row.add_suffix(this._spin);
        this.row.add_suffix(new Gtk.Label({label: '%'}));
        this.row.activatable_widget = this._spin;

        this.setValue(value);
        this._spin.connect('value-changed', () => onChange(this._spin.value / PERCENT));
    }

    // Show `factor` without reporting it back as a change.
    setValue(factor) {
        const percent = Math.round(factor * PERCENT);

        if (this._spin.value !== percent)
            this._spin.value = percent;
    }
};
