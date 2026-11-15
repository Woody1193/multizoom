'use strict';
/* exported EASE_US, ViewEasing */

// How long a smooth move takes (µs). Short, so it reads as motion rather
// than as lag.
var EASE_US = 150_000;

// Power of the ease-out curve: cubic.
const EASE_POWER = 3;

// What one monitor's view is showing while it glides toward its state (the
// target). The target is the live state object, so a pointer move during a
// glide just moves the end point and the glide still ends on time; only a
// new jump (start) restarts it from wherever the view is.
//
// The visible area's left/top edge and its size (1 / zoom) are interpolated,
// so the edges of what's shown move steadily while zooming too.
//
// No `gi` imports and no module imports, so it runs under plain `gjs`.
var ViewEasing = class ViewEasing {
    // state: a lib/zoom/viewport.js state, shown at once.
    constructor(state) {
        this.shown = {zoom: state.zoom, viewX: state.viewX, viewY: state.viewY};
        this.active = false;
        this._from = {zoom: state.zoom, viewX: state.viewX, viewY: state.viewY};
        this._target = state;
        this._startUs = 0;
    }

    // Show `target` straight away, ending any glide.
    snap(target) {
        copyView(target, this.shown);
        this._target = target;
        this.active = false;
    }

    // Glide from what's shown now to `target`, starting at nowUs.
    start(target, nowUs) {
        copyView(this.shown, this._from);
        this._target = target;
        this._startUs = nowUs;
        this.active = true;
    }

    // Move what's shown to where it should be at nowUs. Returns whether the
    // glide is still going. Allocates nothing.
    step(nowUs) {
        const t = Math.min(1, (nowUs - this._startUs) / EASE_US);
        const e = easeOut(t);
        const from = this._from;
        const to = this._target;

        this.shown.viewX = from.viewX + (to.viewX - from.viewX) * e;
        this.shown.viewY = from.viewY + (to.viewY - from.viewY) * e;
        this.shown.zoom = 1 / (1 / from.zoom + (1 / to.zoom - 1 / from.zoom) * e);
        this.active = t < 1;

        return this.active;
    }
};

function copyView(from, to) {
    to.zoom = from.zoom;
    to.viewX = from.viewX;
    to.viewY = from.viewY;
}

// Fast at first, settling gently (cubic ease-out).
function easeOut(t) {
    return 1 - (1 - t) ** EASE_POWER;
}
