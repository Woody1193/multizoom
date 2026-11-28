'use strict';
/* exported MonitorSet */

const {GLib} = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {Crosshairs} = Me.imports.lib.ui.crosshairs;
const {FrameTicker} = Me.imports.lib.ui.frameTicker;
const {MonitorView} = Me.imports.lib.ui.monitorView;
const {geometryKey} = Me.imports.lib.monitors.monitorIdentity;
const {guard} = Me.imports.lib.common.safety;
const Viewport = Me.imports.lib.zoom.viewport;
const {ViewEasing} = Me.imports.lib.zoom.viewEasing;

// The current monitors, each with its state and its view, rebuilt when the
// layout changes. Monitors are addressed by index, as Viewport.monitorIndexAt
// and Meta.Window.get_monitor() number them.
//
// Each state is where its view should be; what the view shows can glide
// there (ViewEasing) instead of jumping. The drawn cursor follows what's
// shown, so it stays over the same content during a glide.
var MonitorSet = class MonitorSet {
    // states: a MonitorStates, so state outlives the views.
    // idOf(monitor): the physical monitor's id, or null (MonitorIds.idOf).
    // cursor: the drawn cursor, which lives inside one view at a time.
    // options.smooth(): whether moves asked to be smooth may glide (settings).
    // options.onError(e): called if a glide or a crosshair update fails.
    // options.crosshairSettings: a CrosshairSettings, for the crosshairs.
    constructor(states, idOf, cursor, {smooth, onError, crosshairSettings}) {
        this._states = states;
        this._idOf = idOf;
        this._cursor = cursor;
        this._smooth = smooth;
        this._monitors = [];
        this._views = [];
        this._easings = [];
        this._cursorAt = {index: -1, x: 0, y: 0};
        this.states = [];

        // If any step fails, undo the ones before it.
        try {
            // The lines through the cursor go wherever it goes.
            this._crosshairs = new Crosshairs(cursor, crosshairSettings, onError);
            this._ticker = new FrameTicker(guard(nowUs => this._onFrame(nowUs), onError));
            this.rebuild();
        } catch (e) {
            this.destroy();
            throw e;
        }
    }

    // Recreate the views for the current monitor layout and ids.
    rebuild() {
        this._destroyViews();

        this._monitors = Main.layoutManager.monitors.map(m => ({
            x: m.x,
            y: m.y,
            width: m.width,
            height: m.height,
            id: this._idOf(m),
            place: geometryKey(m),
        }));

        this.states = this._monitors.map(m => this._states.get(m));

        // A zoom set while the monitor wasn't shown (or a new resolution)
        // may leave its view partly off the monitor; pull it back in.
        this.states.forEach((state, i) => Viewport.setZoomKeepingCenter(state, this._monitors[i], state.zoom));

        this._easings = this.states.map(state => new ViewEasing(state));
        this._cursorAt.index = -1;

        this._views = this._monitors.map((m, i) => {
            const view = new MonitorView(m);

            view.apply(this._easings[i].shown);
            view.setLocked(this.states[i].locked);

            return view;
        });
    }

    // Index of the monitor containing screen point (x, y), or -1.
    indexAt(x, y) {
        return Viewport.monitorIndexAt(this._monitors, x, y);
    }

    // Pan monitor i to follow screen point (x, y) unless it's locked. The
    // point may be outside the monitor: the view then stops at that edge.
    // A smooth follow glides there (focus, text cursor, unlocking); the
    // pointer's isn't. Hot path: allocates nothing.
    follow(i, x, y, smooth) {
        const state = this.states[i];

        if (!state.locked)
            Viewport.followPoint(state, this._monitors[i], x, y);

        this._show(i, smooth);
    }

    // Set monitor i's zoom level, gliding to it; `pointer` is {x, y}.
    zoomTo(i, zoom, pointer) {
        const state = this.states[i];

        Viewport.zoomTo(state, this._monitors[i], zoom, pointer);
        this._show(i, true);
        this._views[i].showZoom(state.zoom);
        this._states.saveZooms();
    }

    // Set the zoom level of `state` (one of the MonitorStates) from outside,
    // around the centre of its view. Not saved: it came from the settings.
    setZoom(state, zoom) {
        const i = this.states.indexOf(state);

        if (i < 0)
            state.zoom = Viewport.clampZoom(zoom);
        else
            Viewport.setZoomKeepingCenter(state, this._monitors[i], zoom);
    }

    setLocked(i, locked) {
        this.states[i].locked = locked;
        this._views[i].setLocked(locked);
    }

    // Draw the cursor on monitor i at screen point (x, y), and keep it
    // there while that view glides.
    placeCursor(i, x, y) {
        this._cursorAt.index = i;
        this._cursorAt.x = x;
        this._cursorAt.y = y;
        this._drawCursor();
    }

    destroy() {
        this._ticker?.destroy();
        this._destroyViews();
        this._crosshairs?.destroy();
        this._ticker = null;
        this._crosshairs = null;
        this.states = [];
        this._easings = [];
    }

    // Show monitor i's state: glide there, or jump unless already gliding,
    // in which case the glide's end point has simply moved.
    _show(i, smooth) {
        const easing = this._easings[i];

        if (smooth && this._smooth()) {
            easing.start(this.states[i], GLib.get_monotonic_time());
            this._ticker.start();
        } else if (!easing.active) {
            easing.snap(this.states[i]);
            this._views[i].apply(easing.shown);
        }
    }

    // One frame of every glide in progress. Returns whether any is left.
    // Runs every frame while gliding, so it allocates nothing.
    _onFrame(nowUs) {
        let moving = false;

        for (let i = 0; i < this._easings.length; i++) {
            const easing = this._easings[i];

            if (!easing.active)
                continue;

            moving = easing.step(nowUs) || moving;
            this._views[i].apply(easing.shown);

            if (i === this._cursorAt.index)
                this._drawCursor();
        }

        return moving;
    }

    _drawCursor() {
        const {index, x, y} = this._cursorAt;
        const shown = this._easings[index].shown;
        const layer = this._views[index].pointerLayer;
        const viewX = (x - shown.viewX) * shown.zoom;
        const viewY = (y - shown.viewY) * shown.zoom;

        this._crosshairs.place(layer, viewX, viewY);
        this._cursor.place(layer, viewX, viewY, shown.zoom);
    }

    _destroyViews() {
        // The cursor image and crosshairs live inside a view; take them out
        // first so they aren't destroyed along with the view.
        this._cursor.detach();
        this._crosshairs?.detach();

        for (const view of this._views)
            view.destroy();

        this._views = [];
    }
};
