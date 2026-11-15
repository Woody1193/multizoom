'use strict';
/* exported badgeText */

// The zoom level is shown as a whole percentage: 2 → "Zoom 200%".
const PERCENT = 100;

const LOCKED_TEXT = 'Locked';
const SEPARATOR = ' · ';

// Text for a monitor view's badge and the panel indicator: "Locked",
// "Zoom 250%", "Locked · Zoom 250%", or '' when nothing should be shown.
// `zoom` is null when the zoom level isn't being shown. Pure, so it runs
// under plain `gjs` for the unit tests.
function badgeText(locked, zoom) {
    const parts = [];

    if (locked)
        parts.push(LOCKED_TEXT);

    if (zoom !== null)
        parts.push(`Zoom ${Math.round(zoom * PERCENT)}%`);

    return parts.join(SEPARATOR);
}
