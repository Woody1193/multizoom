'use strict';
/* exported badgeText */

// Decimal places shown for the zoom level: 2 → "2", 2.5 → "2.5", 1.953125 → "1.95".
const ZOOM_DECIMALS = 2;

const LOCKED_TEXT = 'Locked';
const SEPARATOR = ' · ';

// Text for a monitor view's badge: "Locked", "2.5×", "Locked · 2.5×", or ''
// when the badge should be hidden. `zoom` is null when the zoom level isn't
// being shown. Pure, so it runs under plain `gjs` for the unit tests.
function badgeText(locked, zoom) {
    const parts = [];

    if (locked)
        parts.push(LOCKED_TEXT);

    if (zoom !== null)
        parts.push(`${Number(zoom.toFixed(ZOOM_DECIMALS))}×`);

    return parts.join(SEPARATOR);
}
