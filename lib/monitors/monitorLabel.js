'use strict';
/* exported monitorLabel */

// Human names for the keys MultiZoom saves zoom levels under (see
// lib/monitors/monitorIdentity.js), for the preferences window. Pure, so it runs under
// plain `gjs` for the unit tests.

const ID_PREFIX = 'edid:';
const PART_SEPARATOR = ':';
const MIRROR_SEPARATOR = '+';
const MIRROR_TITLE_SEPARATOR = ' + ';

// Connectors of laptop panels; GNOME calls these "Built-in display".
const BUILT_IN_CONNECTOR = /^(eDP|LVDS|DSI)/;
const BUILT_IN_TITLE = 'Built-in display';

// Products that are only a hex code (e.g. "0x094a") say nothing to people.
const CODE_PRODUCT = /^0x[0-9a-f]+$/i;

const GEOMETRY_KEY = /^(-?\d+),(-?\d+),(\d+)x(\d+)$/;

// {title, subtitle} for a saved key. Ids look like "edid:vendor:product:
// serial-or-connector"; keys saved before ids are geometry.
function monitorLabel(key) {
    if (key.startsWith(ID_PREFIX))
        return idLabel(key);

    const geometry = GEOMETRY_KEY.exec(key);

    if (geometry) {
        const [, x, y, width, height] = geometry;

        return {title: `Display at ${x}, ${y}`, subtitle: `${width} × ${height}, saved by position`};
    }

    return {title: key, subtitle: ''};
}

function idLabel(key) {
    const names = key.split(MIRROR_SEPARATOR).map(id => {
        const parts = id.slice(ID_PREFIX.length).split(PART_SEPARATOR);

        return displayName(parts[0], parts.slice(1, -1).join(PART_SEPARATOR), parts[parts.length - 1]);
    });

    return {title: names.join(MIRROR_TITLE_SEPARATOR), subtitle: ''};
}

// `last` is the serial, or the connector when the monitor has no serial.
function displayName(vendor, product, last) {
    if (BUILT_IN_CONNECTOR.test(last))
        return BUILT_IN_TITLE;

    return CODE_PRODUCT.test(product) || product === '' ? `${vendor} display` : product;
}
