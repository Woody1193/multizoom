'use strict';

// Tests for lib/zoom/viewEasing.js. Run all tests with `make test`.

const {EASE_US, ViewEasing} = imports.lib.zoom.viewEasing;
const {eq, ok} = imports.tests.harness;

const HALF = EASE_US / 2;

// Whether `shown` is the view {zoom, viewX, viewY}.
function eqView(shown, expected, name) {
    for (const field of ['zoom', 'viewX', 'viewY'])
        eq(shown[field], expected[field], `${name} (${field})`);
}

function viewAt(viewX, viewY, zoom) {
    return {viewX, viewY, zoom, locked: false};
}

// Starts out showing its state, not moving.
{
    const state = viewAt(10, 20, 2);
    const easing = new ViewEasing(state);

    eqView(easing.shown, {zoom: 2, viewX: 10, viewY: 20}, 'shows the state at first');
    ok(easing.shown !== state, 'shown is its own object');
    ok(!easing.active, 'not moving at first');
}

// A glide ends exactly on the target, on time, and moves the right way.
{
    const easing = new ViewEasing(viewAt(0, 0, 2));
    const target = viewAt(100, 50, 2);

    easing.start(target, 0);
    ok(easing.step(HALF), 'still moving half way');
    ok(easing.shown.viewX > 50 && easing.shown.viewX < 100, 'more than half way at half time (ease-out)');
    ok(!easing.step(EASE_US), 'done at the end');
    eq(easing.shown.viewX, 100, 'ends on the target x');
    eq(easing.shown.viewY, 50, 'ends on the target y');
    ok(!easing.active, 'not moving after the end');
}

// Zoom eases the visible size (1 / zoom), so its edges move steadily.
{
    const easing = new ViewEasing(viewAt(0, 0, 1));

    easing.start(viewAt(0, 0, 4), 0);
    easing.step(EASE_US / 3);

    const progress = 1 - (1 - 1 / 3) ** 3;

    eq(1 / easing.shown.zoom, 1 + (1 / 4 - 1) * progress, 'visible size follows the curve');
    easing.step(EASE_US);
    eq(easing.shown.zoom, 4, 'ends on the target zoom');
}

// The target is live: moving it during a glide still ends on it, on time.
{
    const easing = new ViewEasing(viewAt(0, 0, 2));
    const target = viewAt(100, 0, 2);

    easing.start(target, 0);
    easing.step(HALF);
    target.viewX = 200;
    easing.step(EASE_US);
    eq(easing.shown.viewX, 200, 'ends on the moved target');
}

// A new jump during a glide starts from what's shown, without a jump.
{
    const easing = new ViewEasing(viewAt(0, 0, 2));

    easing.start(viewAt(100, 0, 2), 0);
    easing.step(HALF);

    const midway = easing.shown.viewX;

    easing.start(viewAt(-100, 0, 2), HALF);
    easing.step(HALF);
    eq(easing.shown.viewX, midway, 'restart begins where the view was');
}

// Snapping shows the target at once and ends any glide.
{
    const easing = new ViewEasing(viewAt(0, 0, 2));

    easing.start(viewAt(100, 0, 2), 0);
    easing.snap(viewAt(30, 40, 3));
    eqView(easing.shown, {zoom: 3, viewX: 30, viewY: 40}, 'snap shows the target');
    ok(!easing.active, 'snap ends the glide');
}
