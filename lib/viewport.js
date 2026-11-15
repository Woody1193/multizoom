'use strict';
/* exported MIN_ZOOM, MAX_ZOOM, clampZoom, newState, followPoint, centerOn,
   setZoomKeepingCenter, zoomTo, stepZoom, followsFocus, monitorIndexAt */

// Pure geometry for one monitor's zoomed view. No `gi` imports, so this file
// runs under plain `gjs` for the unit tests as well as inside GNOME Shell.
//
// Terms:
//   monitor: {x, y, width, height} in screen (stage) coordinates.
//   state:   {zoom, viewX, viewY, locked}. (viewX, viewY) is the screen
//            point shown at the monitor's top-left corner. The visible
//            source area is monitor.width/zoom × monitor.height/zoom.
//
// Functions that run on every pointer movement write into `state` instead of
// returning new objects, so the hot path allocates nothing.

var MIN_ZOOM = 1.0;
var MAX_ZOOM = 16.0;

function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
}

// Zoom levels are rounded to this many decimals, so steps that aren't exact
// in binary (0.1) land on exact values instead of drifting
// (2.3000000000000003).
const ZOOM_PRECISION = 1e6;

function clampZoom(zoom) {
    return clamp(Math.round(zoom * ZOOM_PRECISION) / ZOOM_PRECISION, MIN_ZOOM, MAX_ZOOM);
}

function newState(monitor, zoom) {
    return {zoom: clampZoom(zoom), viewX: monitor.x, viewY: monitor.y, locked: false};
}

// Keep the visible source area inside the monitor's own area.
function clampView(state, monitor) {
    const w = monitor.width / state.zoom;
    const h = monitor.height / state.zoom;

    state.viewX = clamp(state.viewX, monitor.x, monitor.x + monitor.width - w);
    state.viewY = clamp(state.viewY, monitor.y, monitor.y + monitor.height - h);
}

// Proportional tracking of a point (the pointer, focus or text cursor): its
// fraction across the monitor equals its fraction across the visible area,
// so the whole monitor is reachable. Using the same mapping for all three
// means clicking into text, which puts the text cursor under the pointer,
// doesn't move the view.
function followPoint(state, monitor, px, py) {
    const f = 1 - 1 / state.zoom;

    state.viewX = monitor.x + (px - monitor.x) * f;
    state.viewY = monitor.y + (py - monitor.y) * f;
    clampView(state, monitor);
}

// Centre the visible area on a point (focus or text cursor).
function centerOn(state, monitor, cx, cy) {
    state.viewX = cx - monitor.width / state.zoom / 2;
    state.viewY = cy - monitor.height / state.zoom / 2;
    clampView(state, monitor);
}

// Change zoom while keeping the centre of the visible area where it is.
// Used for locked monitors, where the view must not follow the pointer.
function setZoomKeepingCenter(state, monitor, zoom) {
    const cx = state.viewX + monitor.width / state.zoom / 2;
    const cy = state.viewY + monitor.height / state.zoom / 2;

    state.zoom = clampZoom(zoom);
    centerOn(state, monitor, cx, cy);
}

// Change a monitor's zoom the way the user expects for its lock state: a
// locked view zooms around its own centre and stays put; an unlocked one
// keeps following the pointer at {x, y}.
function zoomTo(state, monitor, zoom, pointer) {
    if (state.locked) {
        setZoomKeepingCenter(state, monitor, zoom);

        return;
    }

    state.zoom = clampZoom(zoom);
    followPoint(state, monitor, pointer.x, pointer.y);
}

// How close zoom / step must be to a whole number to count as on the grid.
const GRID_TOLERANCE = 1e-6;

// The next zoom level on a grid of `step` (0.25 → 2, 2.25, 2.5, …), in
// (direction 1) or out (direction -1), so levels stay round percentages.
// A level off the grid (e.g. 3.05 from the old multiplying step) snaps to
// the next grid level in that direction: 3.25 in, 3 out.
function stepZoom(zoom, step, direction) {
    const steps = zoom / step;
    let base = Math.round(steps);

    if (Math.abs(steps - base) > GRID_TOLERANCE)
        base = direction > 0 ? Math.floor(steps) : Math.ceil(steps);

    return clampZoom((base + direction) * step);
}

// Whether keyboard focus and the text cursor may move this view: not when
// it's locked, and there's nothing to pan at 1×.
function followsFocus(state) {
    return !state.locked && state.zoom > MIN_ZOOM;
}

// Index of the monitor containing the point, or -1.
function monitorIndexAt(monitors, x, y) {
    for (let i = 0; i < monitors.length; i++) {
        const m = monitors[i];

        if (x >= m.x && x < m.x + m.width && y >= m.y && y < m.y + m.height)
            return i;
    }

    return -1;
}
