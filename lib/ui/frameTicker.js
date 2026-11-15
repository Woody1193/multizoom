'use strict';
/* exported FrameTicker */

const {Clutter, GLib} = imports.gi;

// Long enough that the loop restarts rarely; the timeline only serves as a
// frame tick, its progress isn't used.
const TIMELINE_MS = 1000;

// Calls onFrame(nowUs) once per frame the stage draws, from start() until
// onFrame returns false. Created once and reused, so starting a glide
// allocates nothing.
var FrameTicker = class FrameTicker {
    constructor(onFrame) {
        this._timeline = new Clutter.Timeline({actor: global.stage, duration: TIMELINE_MS, repeat_count: -1});
        this._timeline.connectObject('new-frame', () => {
            if (!onFrame(GLib.get_monotonic_time()))
                this._timeline.stop();
        }, this);
    }

    start() {
        if (!this._timeline.is_playing())
            this._timeline.start();
    }

    destroy() {
        this._timeline?.stop();
        this._timeline?.disconnectObject(this);
        this._timeline = null;
    }
};
