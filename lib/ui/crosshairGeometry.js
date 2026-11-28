'use strict';
/* exported CLIP_GAP, FALLBACK_COLOR, LINE_STYLES, armRects, linesShown, opacityByte, ringRect */

// Where the crosshair arms and circle go. The arms are laid out as in GNOME's
// magnifier (ui/magnifier.js, Crosshairs.reCenter): each starts half a
// thickness (plus half the gap, when clipped) from the crossing point, so the
// pointer image sits in the middle.
//
// No `gi` imports and no module imports, so it runs under plain `gjs`.

// The hole left around the pointer when `cross-hairs-clip` is on (pixels),
// GNOME's CROSSHAIRS_CLIP_SIZE.
var CLIP_GAP = 100;

// Drawn when `cross-hairs-color` can't be read: the key's default.
var FALLBACK_COLOR = '#ff0000';

// The `crosshair-lines` choices, in the order the preferences window lists
// them.
var LINE_STYLES = ['straight', 'diagonal', 'both', 'none'];

const MAX_OPACITY = 255;

// The arms [left, right, top, bottom] as {x, y, width, height}, relative to
// the crossing point. thickness, length and gap are in view pixels.
function armRects({thickness, length, gap}) {
    const half = thickness / 2;
    const near = gap / 2 + half;
    const far = -near - length;

    return [
        {x: far, y: -half, width: length, height: thickness},
        {x: near, y: -half, width: length, height: thickness},
        {x: -half, y: far, width: thickness, height: length},
        {x: -half, y: near, width: thickness, height: length},
    ];
}

// A settings opacity (0 to 1) as an actor opacity (0 to 255), clamped like
// GNOME's, since set_opacity() rejects values out of range.
function opacityByte(opacity) {
    return Math.round(Math.min(1, Math.max(0, opacity)) * MAX_OPACITY);
}

// Which sets of arms a `crosshair-lines` choice draws: {straight, diagonal}.
// The diagonal set is the straight one turned 45°.
function linesShown(style) {
    return {
        straight: style === 'straight' || style === 'both',
        diagonal: style === 'diagonal' || style === 'both',
    };
}

// The box of a ring around the crossing point, {x, y, size}, for a border of
// `thickness`: the middle of the line lies on `radius`. View pixels.
function ringRect(radius, thickness) {
    const outer = radius + thickness / 2;

    return {x: -outer, y: -outer, size: 2 * outer};
}
