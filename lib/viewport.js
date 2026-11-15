'use strict';
/* exported MIN_ZOOM, MAX_ZOOM, clampZoom, newState, trackPointer, centerOn,
   setZoomKeepingCenter, zoomTo, monitorIndexAt */

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

function clampZoom(zoom) {
    return clamp(zoom, MIN_ZOOM, MAX_ZOOM);
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

// Proportional tracking: the pointer's fraction across the monitor equals its
// fraction across the visible area, so the whole monitor is reachable and the
// drawn cursor sits where the real one is relative to the monitor edges.
function trackPointer(state, monitor, px, py) {
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
    trackPointer(state, monitor, pointer.x, pointer.y);
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
