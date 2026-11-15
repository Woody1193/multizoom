'use strict';

// Tests for lib/viewport.js. Run all tests with `make test`.

const V = imports.lib.viewport;
const {eq} = imports.tests.harness;

// Two side-by-side monitors: left 2560x1080, right 1920x1080.
const left = {x: 0, y: 0, width: 2560, height: 1080};
const right = {x: 2560, y: 0, width: 1920, height: 1080};
const monitors = [left, right];

// clampZoom
eq(V.clampZoom(0.5), 1, 'clampZoom low');
eq(V.clampZoom(99), 16, 'clampZoom high');
eq(V.clampZoom(2.5), 2.5, 'clampZoom mid');

// trackPointer: corners and centre map onto the monitor's own area only.
let s = V.newState(right, 2);

V.trackPointer(s, right, right.x, right.y);
eq(s.viewX, right.x, 'pointer top-left → viewX');
eq(s.viewY, right.y, 'pointer top-left → viewY');
V.trackPointer(s, right, right.x + right.width, right.y + right.height);
eq(s.viewX, right.x + right.width / 2, 'pointer bottom-right → viewX');
eq(s.viewY, right.y + right.height / 2, 'pointer bottom-right → viewY');
V.trackPointer(s, right, right.x + right.width / 2, right.y + right.height / 2);
eq(s.viewX, right.x + right.width / 4, 'pointer centre → viewX');

// The pointer's drawn position equals its real position relative to the monitor.
const drawnX = (right.x + 700 - (right.x + 700 * 0.5)) * 2;

V.trackPointer(s, right, right.x + 700, 0);
eq((right.x + 700 - s.viewX) * s.zoom, drawnX, 'proportional keeps cursor at same monitor position');

// Pointer outside the monitor is clamped, never showing the neighbour.
V.trackPointer(s, right, 0, 0);
eq(s.viewX, right.x, 'pointer left of monitor clamps');

// zoom 1 → view is exactly the monitor.
s = V.newState(left, 1);
V.trackPointer(s, left, 1234, 567);
eq(s.viewX, 0, 'zoom 1 viewX');
eq(s.viewY, 0, 'zoom 1 viewY');

// centerOn, including clamping at edges.
s = V.newState(left, 4);
V.centerOn(s, left, 1280, 540);
eq(s.viewX, 1280 - 320, 'centerOn x');
eq(s.viewY, 540 - 135, 'centerOn y');
V.centerOn(s, left, 5, 5);
eq(s.viewX, 0, 'centerOn clamps left');
eq(s.viewY, 0, 'centerOn clamps top');
V.centerOn(s, left, 2559, 1079);
eq(s.viewX, 2560 - 640, 'centerOn clamps right');
eq(s.viewY, 1080 - 270, 'centerOn clamps bottom');

// setZoomKeepingCenter keeps the centre fixed.
s = V.newState(left, 2);
V.centerOn(s, left, 1000, 500);
V.setZoomKeepingCenter(s, left, 4);
eq(s.zoom, 4, 'setZoom zoom');
eq(s.viewX + left.width / 4 / 2, 1000, 'setZoom keeps centre x');
eq(s.viewY + left.height / 4 / 2, 500, 'setZoom keeps centre y');
V.setZoomKeepingCenter(s, left, 0.1);
eq(s.zoom, 1, 'setZoom clamps');
eq(s.viewX, 0, 'setZoom at 1 shows whole monitor');

// monitorIndexAt
eq(V.monitorIndexAt(monitors, 10, 10), 0, 'monitorIndexAt left');
eq(V.monitorIndexAt(monitors, 2560, 10), 1, 'monitorIndexAt right edge belongs to right');
eq(V.monitorIndexAt(monitors, 4480, 10), -1, 'monitorIndexAt off-screen');

// zoomTo: unlocked follows the pointer, locked keeps its centre.
s = V.newState(left, 2);
V.zoomTo(s, left, 4, {x: 2560, y: 1080});
eq(s.zoom, 4, 'zoomTo unlocked sets zoom');
eq(s.viewX, 2560 - 640, 'zoomTo unlocked tracks pointer x');
eq(s.viewY, 1080 - 270, 'zoomTo unlocked tracks pointer y');

s = V.newState(left, 2);
V.centerOn(s, left, 1000, 500);
s.locked = true;
V.zoomTo(s, left, 4, {x: 0, y: 0});
eq(s.viewX + 2560 / 4 / 2, 1000, 'zoomTo locked keeps centre x (ignores pointer)');
eq(s.viewY + 1080 / 4 / 2, 500, 'zoomTo locked keeps centre y');
V.zoomTo(s, left, 99, {x: 0, y: 0});
eq(s.zoom, 16, 'zoomTo clamps');
