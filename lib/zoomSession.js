'use strict';
/* exported ZoomSession */

const {GLib, Meta} = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const Viewport = Me.imports.lib.viewport;
const {Cursor} = Me.imports.lib.cursor;
const {FocusWatch} = Me.imports.lib.focusWatch;
const {MonitorView} = Me.imports.lib.monitorView;
const {PointerWatch} = Me.imports.lib.pointer;
const {ZoomIndicator} = Me.imports.lib.zoomIndicator;
const {guard, safely} = Me.imports.lib.safety;

const DESKTOP_HIDDEN = 0;
const DESKTOP_VISIBLE = 255;

// Focus and the text cursor take over once the pointer has been still this
// long, so they don't fight a mouse that is moving. GNOME's magnifier waits
// 1 s, which felt laggy when going from the mouse to typing; because both
// use the same mapping (Viewport.followPoint), a short wait is enough.
const POINTER_REST_US = 250_000;

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
        this._focus = null;
        this._indicator = null;
        this._unredirectDisabled = false;

        // Last known pointer: its monitor (-1 before the first report), its
        // screen position, and when it last moved (monotonic µs). Mutated in
        // place on the hot path.
        this._lastPointer = {index: -1, x: 0, y: 0, movedUs: 0};

        try {
            this._takeOverScreen(onError);
        } catch (e) {
            this.destroy();
            throw e;
        }
    }

    // Zoom the monitor under the pointer by `factor` (> 1 zooms in).
    zoomBy(factor) {
        const i = this._lastPointer.index;

        if (i < 0)
            return;

        const state = this._viewStates[i];

        Viewport.zoomTo(state, this._monitors[i], state.zoom * factor, this._lastPointer);
        this._redraw(i);
        this._views[i].showZoom(state.zoom);
    }

    // Lock or unlock the view on the monitor under the pointer. Unlocking
    // makes it follow the pointer again straight away.
    toggleLock() {
        const i = this._lastPointer.index;

        if (i < 0)
            return;

        this._setLocked(i, !this._viewStates[i].locked);
        this._pointer.forceUpdate();
    }

    unlockAll() {
        for (let i = 0; i < this._viewStates.length; i++)
            this._setLocked(i, false);

        this._pointer.forceUpdate();
    }

    destroy() {
        safely(() => this._focus?.destroy());
        safely(() => this._pointer?.destroy());
        safely(() => Main.layoutManager.disconnectObject(this));
        safely(() => Main.uiGroup.set_opacity(DESKTOP_VISIBLE));
        safely(() => this._destroyViews());
        safely(() => this._cursor?.destroy());
        safely(() => this._indicator?.destroy());

        if (this._unredirectDisabled)
            safely(() => Meta.enable_unredirect_for_display(global.display));

        this._focus = null;
        this._pointer = null;
        this._cursor = null;
        this._indicator = null;
        this._unredirectDisabled = false;
    }

    _takeOverScreen(onError) {
        // Full-screen windows normally bypass the compositor on X11 and would
        // then be missing from the zoomed copy.
        Meta.disable_unredirect_for_display(global.display);
        this._unredirectDisabled = true;

        this._cursor = new Cursor();
        this._indicator = new ZoomIndicator();
        this._buildViews();
        Main.layoutManager.connectObject('monitors-changed', guard(() => this._buildViews(), onError), this);

        // The views cover every monitor; don't also draw the desktop under them.
        Main.uiGroup.set_opacity(DESKTOP_HIDDEN);

        this._pointer = new PointerWatch(guard((x, y) => this._onPointer(x, y), onError));
        this._pointer.forceUpdate();

        this._focus = new FocusWatch(
            i => this._wantsFocus(i),
            (x, y) => this._onFocusPoint(x, y),
            onError);
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
        this._lastPointer.index = -1;

        this._views = this._monitors.map((m, i) => {
            const view = new MonitorView(m);

            view.apply(this._viewStates[i]);
            view.setLocked(this._viewStates[i].locked);

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

        this._lastPointer.index = i;
        this._lastPointer.x = x;
        this._lastPointer.y = y;
        this._lastPointer.movedUs = GLib.get_monotonic_time();

        if (!state.locked)
            Viewport.followPoint(state, this._monitors[i], x, y);

        this._redraw(i);
    }

    // Cheap gate in front of the blocking AT-SPI lookups: is monitor i
    // allowed to follow focus right now?
    _wantsFocus(i) {
        const state = this._viewStates[i];
        const pointerResting = GLib.get_monotonic_time() - this._lastPointer.movedUs >= POINTER_REST_US;

        return pointerResting && state !== undefined && Viewport.followsFocus(state);
    }

    // The focused widget or text cursor is at screen point (x, y), which may
    // be on a different monitor from its window.
    _onFocusPoint(x, y) {
        const i = Viewport.monitorIndexAt(this._monitors, x, y);

        if (i < 0 || !this._wantsFocus(i))
            return;

        Viewport.followPoint(this._viewStates[i], this._monitors[i], x, y);
        this._redraw(i);
    }

    // Show monitor i's current state. The cursor and panel indicator follow
    // the pointer's monitor only.
    _redraw(i) {
        const state = this._viewStates[i];
        const view = this._views[i];

        view.apply(state);

        if (i !== this._lastPointer.index)
            return;

        this._indicator.show(state);
        this._cursor.place(view.actor,
            (this._lastPointer.x - state.viewX) * state.zoom,
            (this._lastPointer.y - state.viewY) * state.zoom,
            state.zoom);
    }

    _setLocked(i, locked) {
        this._viewStates[i].locked = locked;
        this._views[i].setLocked(locked);
    }
};
