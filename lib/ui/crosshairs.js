'use strict';
/* exported Crosshairs */

const {Clutter, GObject, St} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {CLIP_GAP, FALLBACK_COLOR, armRects, linesShown, opacityByte, ringRect} = Me.imports.lib.ui.crosshairGeometry;
const {guard} = Me.imports.lib.common.safety;

// Left, right, top and bottom (crosshairGeometry.armRects).
const ARM_COUNT = 4;
const DIAGONAL_DEGREES = 45;

// Lines (straight, diagonal or both) and an optional circle through the
// pointer, drawn from a CrosshairSettings and redrawn when it changes.
//
// They live in the same view as the drawn cursor, just under it, and aren't
// zoomed: sizes are in view pixels, as in GNOME's magnifier. They hide
// whenever the cursor image does (an app hid the pointer).
var Crosshairs = class Crosshairs {
    // cursor: the Cursor whose image these cross at.
    // settings: a CrosshairSettings, what to draw.
    // onError(e): called if applying changed settings fails.
    constructor(cursor, settings, onError) {
        this._settings = settings;

        // The outer actor follows the "show" setting, the inner one the
        // cursor image's visibility.
        this.actor = new Clutter.Actor({name: 'multizoom-crosshairs'});
        this._shapes = new Clutter.Actor();
        this.actor.add_child(this._shapes);

        // Each set of arms is a group at the crossing point, so the diagonal
        // set is the same arms turned around it.
        this._straight = armGroup(this._shapes);
        this._diagonal = armGroup(this._shapes);
        this._diagonal.rotation_angle_z = DIAGONAL_DEGREES;
        this._ring = new St.Widget();
        this._shapes.add_child(this._ring);

        // Read the settings before connecting anything, so a constructor
        // that throws here leaves no handler or binding behind.
        this._update();

        this._binding = cursor.actor.bind_property('visible', this._shapes, 'visible',
            GObject.BindingFlags.SYNC_CREATE);

        settings.connect(guard(() => this._update(), onError), this);
    }

    // Cross at view pixel (x, y) inside `parent`, under everything already
    // there. Called on every pointer movement: only sets properties.
    place(parent, x, y) {
        if (this.actor.get_parent() !== parent) {
            this.detach();
            parent.insert_child_at_index(this.actor, 0);
        }

        this.actor.set_position(Math.round(x), Math.round(y));
    }

    // Take the shapes out of their view, e.g. before that view is destroyed.
    detach() {
        const parent = this.actor.get_parent();

        if (parent)
            parent.remove_child(this.actor);
    }

    destroy() {
        this._settings.disconnect(this);
        this._binding.unbind();
        this.actor.destroy();
        this.actor = null;
        this._shapes = null;
        this._straight = null;
        this._diagonal = null;
        this._ring = null;
        this._binding = null;
        this._settings = null;
    }

    // Redraw from the current settings: sizes, colours and which shapes show.
    _update() {
        const style = this._settings.read();
        const paint = {color: parseColor(style.color), opacity: opacityByte(style.opacity)};

        this._updateArms(style, paint);
        this._updateRing(style, paint);
        this.actor.visible = style.show;
    }

    _updateArms(style, {color, opacity}) {
        const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;

        // GNOME divides the length by the scale factor too.
        const rects = armRects({
            thickness: style.thickness,
            length: style.length / scale,
            gap: style.clip ? CLIP_GAP : 0,
        });

        for (const group of [this._straight, this._diagonal]) {
            group.get_children().forEach((arm, i) => {
                const {x, y, width, height} = rects[i];

                arm.set_position(x, y);
                arm.set_size(width, height);
                arm.background_color = color;
                arm.opacity = opacity;
            });
        }

        const shown = linesShown(style.lines);

        this._straight.visible = shown.straight;
        this._diagonal.visible = shown.diagonal;
    }

    // The circle is a round border, so it needs no drawing code.
    _updateRing({radius, thickness, circle}, {color, opacity}) {
        const {x, y, size} = ringRect(radius, thickness);

        this._ring.set_position(x, y);
        this._ring.set_size(size, size);
        this._ring.opacity = opacity;
        this._ring.style = `border: ${thickness}px solid rgb(${color.red}, ${color.green}, ${color.blue});` +
            ` border-radius: ${size / 2}px;`;

        this._ring.visible = circle;
    }
};

// A group of four arms at (0, 0) inside `parent`.
function armGroup(parent) {
    const group = new Clutter.Actor();

    for (let i = 0; i < ARM_COUNT; i++)
        group.add_child(new Clutter.Actor());

    parent.add_child(group);

    return group;
}

// A colour as GNOME's magnifier reads it ('#ff0000', 'red', 'rgb(…)'); red if
// it can't be read.
function parseColor(text) {
    const [parsed, color] = Clutter.Color.from_string(text);

    return parsed ? color : Clutter.Color.from_string(FALLBACK_COLOR)[1];
}
