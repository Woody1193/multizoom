'use strict';
/* exported ViewBadge */

const {Clutter, GLib, St} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {badgeText} = Me.imports.lib.badgeText;

// How long the zoom level stays visible after it changes.
const ZOOM_VISIBLE_MS = 1500;

// Gap between the badge and the view's top-right corner, in view pixels.
const MARGIN_PX = 24;

// Large, high-contrast text: the badge is for people who need zoom to read.
const STYLE = [
    'font-size: 24px',
    'font-weight: bold',
    'color: #ffffff',
    'background-color: rgba(0, 0, 0, 0.8)',
    'padding: 8px 16px',
    'border-radius: 8px',
].join('; ');

// A label in the top-right corner of one monitor's view. It is drawn on top of
// the zoomed copy and isn't zoomed itself, so it stays visible wherever the
// view is panned. Shows "Locked" while the view is locked, and the zoom level
// briefly after it changes.
var ViewBadge = class ViewBadge {
    constructor(parent) {
        this._locked = false;
        this._zoom = null; // shown zoom level, or null when not showing it
        this._hideZoomId = 0;

        this._label = new St.Label({style: STYLE, visible: false});
        this._label.add_constraint(new Clutter.AlignConstraint({
            source: parent,
            align_axis: Clutter.AlignAxis.X_AXIS,
            factor: 1,
        }));

        this._label.set_translation(-MARGIN_PX, MARGIN_PX, 0);
        parent.add_child(this._label);
    }

    setLocked(locked) {
        this._locked = locked;
        this._update();
    }

    // Show the zoom level for ZOOM_VISIBLE_MS, restarting the timer if it's
    // already showing.
    flashZoom(zoom) {
        this._zoom = zoom;
        this._cancelHideZoom();

        this._hideZoomId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ZOOM_VISIBLE_MS, () => {
            this._hideZoomId = 0;
            this._zoom = null;
            this._update();

            return GLib.SOURCE_REMOVE;
        });

        GLib.Source.set_name_by_id(this._hideZoomId, '[multizoom] hide zoom level');
        this._update();
    }

    destroy() {
        this._cancelHideZoom();
        this._label.destroy();
        this._label = null;
    }

    _cancelHideZoom() {
        if (this._hideZoomId) {
            GLib.source_remove(this._hideZoomId);
            this._hideZoomId = 0;
        }
    }

    _update() {
        const text = badgeText(this._locked, this._zoom);

        this._label.text = text;
        this._label.visible = text !== '';
    }
};
