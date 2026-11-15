'use strict';
/* exported MonitorSet */

const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const Viewport = Me.imports.lib.viewport;
const {MonitorView} = Me.imports.lib.monitorView;

// The current monitors, each with its state and its view, rebuilt when the
// layout changes. Monitors are addressed by index, as Viewport.monitorIndexAt
// and Meta.Window.get_monitor() number them.
var MonitorSet = class MonitorSet {
    // states: a MonitorStates, so state outlives the views.
    // cursor: the drawn cursor, which lives inside one view at a time.
    constructor(states, cursor) {
        this._states = states;
        this._cursor = cursor;
        this._monitors = [];
        this._views = [];
        this.states = [];

        this.rebuild();
    }

    // Recreate the views for the current monitor layout.
    rebuild() {
        this._destroyViews();

        this._monitors = Main.layoutManager.monitors.map(m => ({
            x: m.x,
            y: m.y,
            width: m.width,
            height: m.height,
        }));

        this.states = this._monitors.map(m => this._states.get(m));

        this._views = this._monitors.map((m, i) => {
            const view = new MonitorView(m);

            view.apply(this.states[i]);
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
    // Hot path: allocates nothing.
    follow(i, x, y) {
        const state = this.states[i];

        if (!state.locked)
            Viewport.followPoint(state, this._monitors[i], x, y);

        this._views[i].apply(state);
    }

    // Zoom monitor i by `factor` (> 1 zooms in); `pointer` is {x, y}.
    zoomBy(i, factor, pointer) {
        const state = this.states[i];

        Viewport.zoomTo(state, this._monitors[i], state.zoom * factor, pointer);
        this._views[i].apply(state);
        this._views[i].showZoom(state.zoom);
        this._states.saveZooms();
    }

    setLocked(i, locked) {
        this.states[i].locked = locked;
        this._views[i].setLocked(locked);
    }

    // Draw the cursor on monitor i at screen point (x, y).
    placeCursor(i, x, y) {
        const state = this.states[i];

        this._cursor.place(this._views[i].actor,
            (x - state.viewX) * state.zoom,
            (y - state.viewY) * state.zoom,
            state.zoom);
    }

    destroy() {
        this._destroyViews();
        this.states = [];
    }

    _destroyViews() {
        // The cursor image lives inside a view; take it out first so it isn't
        // destroyed along with the view.
        this._cursor.detach();

        for (const view of this._views)
            view.destroy();

        this._views = [];
    }
};
