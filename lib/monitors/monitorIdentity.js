'use strict';
/* exported monitorId, idsByIndex, geometryKey */

// Stable names for physical monitors, from the EDID details Mutter reports
// (org.gnome.Mutter.DisplayConfig.GetCurrentState). Pure, so it runs under
// plain `gjs` for the unit tests.

const ID_PREFIX = 'edid:';
const PART_SEPARATOR = ':';
const MIRROR_SEPARATOR = '+';

// Panels and cheap monitors often report no serial, or a zero one.
const MISSING_SERIALS = new Set(['', '0', '0x00000000']);

// `spec` is Mutter's [connector, vendor, product, serial]. With a real
// serial the id leaves out the connector, so the monitor keeps its id on any
// port; without one, the connector tells identical monitors apart (and a
// laptop's built-in panel never changes port).
function monitorId([connector, vendor, product, serial]) {
    const parts = MISSING_SERIALS.has(serial)
        ? [vendor, product, connector]
        : [vendor, product, serial];

    return ID_PREFIX + parts.join(PART_SEPARATOR);
}

// Ids per monitor index. specs: Mutter's monitor specs; indexOf(connector):
// the index of the monitor showing that connector, or -1 if it's off.
// Mirrored connectors share an index, so their ids are joined, sorted so the
// result doesn't depend on Mutter's order.
function idsByIndex(specs, indexOf) {
    const byIndex = new Map();

    for (const spec of specs) {
        const index = indexOf(spec[0]);

        if (index < 0)
            continue;

        byIndex.set(index, [...byIndex.get(index) ?? [], monitorId(spec)]);
    }

    return new Map([...byIndex].map(([index, ids]) => [index, ids.sort().join(MIRROR_SEPARATOR)]));
}

// Key for a monitor ({x, y, width, height}) by where it is: the fallback
// before Mutter has answered, and how zoom levels were saved before ids.
function geometryKey(monitor) {
    return `${monitor.x},${monitor.y},${monitor.width}x${monitor.height}`;
}
