'use strict';
/* exported ZoomSession */

const {GLib, Meta} = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const Viewport = Me.imports.lib.viewport;
const {Cursor} = Me.imports.lib.cursor;
const {FocusWatch} = Me.imports.lib.focusWatch;
const {MonitorSet} = Me.imports.lib.monitorSet;
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
//
// In between, it routes input to monitors: the pointer, focus and shortcuts
// each decide which monitor they move. The monitors and views themselves
// are a MonitorSet.
var ZoomSession = class ZoomSession {
    // states: a MonitorStates, so zoom levels outlive the session.
    // idOf(monitor): the physical monitor's id, or null (MonitorIds.idOf).
    // onError(e): called if anything inside fails later on.
    constructor(states, idOf, onError) {
        this._cursor = null;
        this._monitors = null;
        this._indicator = null;
        this._pointer = null;
        this._focus = null;
        this._unredirectDisabled = false;

        // Last known pointer: its monitor (-1 before the first report), its
        // screen position, and when it last moved (monotonic µs). Mutated in
        // place on the hot path.
        this._lastPointer = {index: -1, x: 0, y: 0, movedUs: 0};

        try {
            this._takeOverScreen(states, idOf, onError);
        } catch (e) {
            this.destroy();
            throw e;
        }
    }

    // Zoom the monitor under the pointer one `step` in (direction 1) or out
    // (direction -1).
    stepZoom(step, direction) {
        const i = this._lastPointer.index;

        if (i < 0)
            return;

        const zoom = Viewport.stepZoom(this._monitors.states[i].zoom, step, direction);

        this._monitors.zoomTo(i, zoom, this._lastPointer);
        this._showPointer();
    }

    // Lock or unlock the view on the monitor under the pointer. Unlocking
    // makes it follow the pointer again straight away.
    toggleLock() {
        const i = this._lastPointer.index;

        if (i < 0)
            return;

        this._monitors.setLocked(i, !this._monitors.states[i].locked);
        this._pointer.forceUpdate();
    }

    unlockAll() {
        for (let i = 0; i < this._monitors.states.length; i++)
            this._monitors.setLocked(i, false);

        this._pointer.forceUpdate();
    }

    // Mutter told us which physical monitor is where; rebuild so each one
    // gets its own state.
    monitorIdsChanged() {
        this._onMonitorsChanged();
    }

    destroy() {
        safely(() => this._focus?.destroy());
        safely(() => this._pointer?.destroy());
        safely(() => Main.layoutManager.disconnectObject(this));
        safely(() => Main.uiGroup.set_opacity(DESKTOP_VISIBLE));
        safely(() => this._monitors?.destroy());
        safely(() => this._cursor?.destroy());
        safely(() => this._indicator?.destroy());

        if (this._unredirectDisabled)
            safely(() => Meta.enable_unredirect_for_display(global.display));

        this._focus = null;
        this._pointer = null;
        this._monitors = null;
        this._cursor = null;
        this._indicator = null;
        this._unredirectDisabled = false;
    }

    _takeOverScreen(states, idOf, onError) {
        // Full-screen windows normally bypass the compositor on X11 and would
        // then be missing from the zoomed copy.
        Meta.disable_unredirect_for_display(global.display);
        this._unredirectDisabled = true;

        this._cursor = new Cursor();
        this._indicator = new ZoomIndicator();
        this._monitors = new MonitorSet(states, idOf, this._cursor);
        Main.layoutManager.connectObject('monitors-changed', guard(() => this._onMonitorsChanged(), onError), this);

        // The views cover every monitor; don't also draw the desktop under them.
        Main.uiGroup.set_opacity(DESKTOP_HIDDEN);

        this._pointer = new PointerWatch(guard((x, y) => this._onPointer(x, y), onError));
        this._pointer.forceUpdate();

        this._focus = new FocusWatch(
            i => this._wantsFocus(i),
            (x, y) => this._onFocusPoint(x, y),
            onError);
    }

    _onMonitorsChanged() {
        this._monitors.rebuild();
        this._lastPointer.index = -1;
        this._pointer.forceUpdate();
    }

    // Hot path: runs on every pointer movement. Only updates numbers in
    // existing state objects and actor properties.
    _onPointer(x, y) {
        const i = this._monitors.indexAt(x, y);

        // In a gap between monitors.
        if (i < 0)
            return;

        // A fast flick can leave a monitor between two polls, short of the
        // edge it crossed. Following the exit point pins that view to the
        // edge, as a slow move would have.
        const left = this._lastPointer.index;

        if (left >= 0 && left !== i)
            this._monitors.follow(left, x, y);

        this._lastPointer.index = i;
        this._lastPointer.x = x;
        this._lastPointer.y = y;
        this._lastPointer.movedUs = GLib.get_monotonic_time();

        this._monitors.follow(i, x, y);
        this._showPointer();
    }

    // Cheap gate in front of the blocking AT-SPI lookups: is monitor i
    // allowed to follow focus right now?
    _wantsFocus(i) {
        const state = this._monitors.states[i];
        const pointerResting = GLib.get_monotonic_time() - this._lastPointer.movedUs >= POINTER_REST_US;

        return pointerResting && state !== undefined && Viewport.followsFocus(state);
    }

    // The focused widget or text cursor is at screen point (x, y), which may
    // be on a different monitor from its window.
    _onFocusPoint(x, y) {
        const i = this._monitors.indexAt(x, y);

        if (i < 0 || !this._wantsFocus(i))
            return;

        this._monitors.follow(i, x, y);

        if (i === this._lastPointer.index)
            this._showPointer();
    }

    // Redraw the cursor and panel indicator for the pointer's monitor, after
    // its view moved or its state changed.
    _showPointer() {
        const {index, x, y} = this._lastPointer;

        this._indicator.show(this._monitors.states[index]);
        this._monitors.placeCursor(index, x, y);
    }
};
