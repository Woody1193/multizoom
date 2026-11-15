'use strict';
/* exported MonitorView */

const {Clutter, Shell} = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {ViewBadge} = Me.imports.lib.ui.viewBadge;

// One monitor's zoomed view: a clipped box at the monitor's position holding a
// scaled live copy of the whole desktop (Main.uiGroup). The same technique as
// GNOME's magnifier (ui/magnifier.js, ZoomRegion._createActors), once per
// monitor. The box is hidden from picking, so clicks reach the real windows
// underneath at their real screen coordinates.
var MonitorView = class MonitorView {
    constructor(monitor) {
        this.monitor = monitor;
        this.actor = new Clutter.Actor({
            name: 'multizoom-view',
            x: monitor.x,
            y: monitor.y,
            width: monitor.width,
            height: monitor.height,
            clip_to_allocation: true,
            background_color: Clutter.Color.get_static(Clutter.StaticColor.BLACK),
        });

        Shell.util_set_hidden_from_pick(this.actor, true);

        this._clone = new Clutter.Clone({source: Main.uiGroup});
        this.actor.add_child(this._clone);

        // On top of the copy, so it isn't zoomed.
        this._badge = new ViewBadge(this.actor);

        global.stage.add_child(this.actor);
    }

    // `state` is a lib/zoom/viewport.js state. Screen point (viewX, viewY) is drawn
    // at this view's top-left corner; the copy is in screen coordinates, so a
    // screen point p lands at view pixel (p - view) * zoom.
    apply(state) {
        const z = state.zoom;

        this._clone.set_scale(z, z);
        this._clone.set_position(Math.round(-state.viewX * z), Math.round(-state.viewY * z));
    }

    // Show the zoom level briefly on this view's badge.
    showZoom(zoom) {
        this._badge.flashZoom(zoom);
    }

    setLocked(locked) {
        this._badge.setLocked(locked);
    }

    destroy() {
        this._badge.destroy();
        this.actor.destroy();
        this.actor = null;
        this._clone = null;
        this._badge = null;
    }
};
