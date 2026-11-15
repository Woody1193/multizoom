'use strict';
/* exported ZoomSession */

const {Meta} = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const Viewport = Me.imports.lib.viewport;
const {Cursor} = Me.imports.lib.cursor;
const {MonitorView} = Me.imports.lib.monitorView;
const {PointerWatch} = Me.imports.lib.pointer;
const {guard, safely} = Me.imports.lib.safety;

const DESKTOP_HIDDEN = 0;
const DESKTOP_VISIBLE = 255;

// One period of zoom being on. The constructor takes over the screen;
// destroy() gives it back exactly as it was. If the constructor fails part
// way, it undoes what it did and rethrows.
var ZoomSession = class ZoomSession {
    // states: a MonitorStates, so zoom levels outlive the session.
    // onError(e): called if anything inside fails later on.
    constructor(states, onError) {
        this._states = states;
        this._monitors = [];
        this._viewStates = [];
        this._views = [];
        this._cursor = null;
        this._pointer = null;
        this._unredirectDisabled = false;

        try {
            this._takeOverScreen(onError);
        } catch (e) {
            this.destroy();
            throw e;
        }
    }

    destroy() {
        safely(() => this._pointer?.destroy());
        safely(() => Main.layoutManager.disconnectObject(this));
        safely(() => Main.uiGroup.set_opacity(DESKTOP_VISIBLE));
        safely(() => this._destroyViews());
        safely(() => this._cursor?.destroy());

        if (this._unredirectDisabled)
            safely(() => Meta.enable_unredirect_for_display(global.display));

        this._pointer = null;
        this._cursor = null;
        this._unredirectDisabled = false;
    }

    _takeOverScreen(onError) {
        // Full-screen windows normally bypass the compositor on X11 and would
        // then be missing from the zoomed copy.
        Meta.disable_unredirect_for_display(global.display);
        this._unredirectDisabled = true;

        this._cursor = new Cursor();
        this._buildViews();
        Main.layoutManager.connectObject('monitors-changed', guard(() => this._buildViews(), onError), this);

        // The views cover every monitor; don't also draw the desktop under them.
        Main.uiGroup.set_opacity(DESKTOP_HIDDEN);

        this._pointer = new PointerWatch(guard((x, y) => this._onPointer(x, y), onError));
        this._pointer.forceUpdate();
    }

    _buildViews() {
        this._destroyViews();

        this._monitors = Main.layoutManager.monitors.map(m => ({
            x: m.x,
            y: m.y,
            width: m.width,
            height: m.height,
        }));

        this._viewStates = this._monitors.map(m => this._states.get(m));

        this._views = this._monitors.map((m, i) => {
            const view = new MonitorView(m);

            view.apply(this._viewStates[i]);

            return view;
        });

        this._pointer?.forceUpdate();
    }

    _destroyViews() {
        // The cursor image lives inside a view; take it out first so it isn't
        // destroyed along with the view.
        this._cursor?.detach();

        for (const view of this._views)
            view.destroy();

        this._views = [];
    }

    // Hot path: runs on every pointer movement. Only updates numbers in
    // existing state objects and actor properties.
    _onPointer(x, y) {
        const i = Viewport.monitorIndexAt(this._monitors, x, y);

        // In a gap between monitors.
        if (i < 0)
            return;

        const state = this._viewStates[i];
        const view = this._views[i];

        if (!state.locked) {
            Viewport.trackPointer(state, this._monitors[i], x, y);
            view.apply(state);
        }

        this._cursor.place(view.actor,
            (x - state.viewX) * state.zoom,
            (y - state.viewY) * state.zoom,
            state.zoom);
    }
};
