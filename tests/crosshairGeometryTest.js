'use strict';

// Tests for lib/ui/crosshairGeometry.js. Run all tests with `make test`.

const {CLIP_GAP, armRects, linesShown, opacityByte, ringRect} = imports.lib.ui.crosshairGeometry;
const {eq} = imports.tests.harness;

const rectText = r => `${r.x},${r.y} ${r.width}x${r.height}`;

// Not clipped: the arms meet at the crossing point, leaving only the
// thickness-sized square the pointer covers.
{
    const [left, right, top, bottom] = armRects({thickness: 8, length: 100, gap: 0});

    eq(rectText(left), '-104,-4 100x8', 'left arm ends half a thickness before the centre');
    eq(rectText(right), '4,-4 100x8', 'right arm starts half a thickness after it');
    eq(rectText(top), '-4,-104 8x100', 'top arm');
    eq(rectText(bottom), '-4,4 8x100', 'bottom arm');
}

// Clipped: a gap of CLIP_GAP around the pointer.
{
    const [left, right] = armRects({thickness: 8, length: 100, gap: CLIP_GAP});

    eq(right.x - (left.x + left.width), CLIP_GAP + 8, 'clipped arms leave the gap plus the thickness');
}

eq(opacityByte(0.66), 168, 'GNOME default opacity');
eq(opacityByte(-1), 0, 'opacity below 0 clamps');
eq(opacityByte(2), 255, 'opacity above 1 clamps');

// Each `crosshair-lines` choice.
const shownText = style => {
    const {straight, diagonal} = linesShown(style);

    return `${straight} ${diagonal}`;
};

eq(shownText('straight'), 'true false', 'straight draws only +');
eq(shownText('diagonal'), 'false true', 'diagonal draws only ×');
eq(shownText('both'), 'true true', 'both draws + and ×');
eq(shownText('none'), 'false false', 'none draws no lines');

// The ring's line is centred on the radius.
{
    const ring = ringRect(50, 8);

    eq(`${ring.x},${ring.y} ${ring.size}`, '-54,-54 108', 'ring box reaches half a thickness past the radius');
}
