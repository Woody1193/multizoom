'use strict';
/* exported connectWhileAlive, hexColor, schemaRange, PERCENT */

// Small helpers shared by the preferences window. Runs in the preferences
// process (GTK 4), never inside GNOME Shell.

// Zoom levels are stored as factors (2.0) and shown as percentages (200).
var PERCENT = 100;

const BYTE = 255;
const HEX = 16;

// Connect `handler` to `object`'s `signal` until `widget` is destroyed, so
// settings handlers don't outlive the window.
function connectWhileAlive(object, signal, handler, widget) {
    const id = object.connect(signal, handler);

    widget.connect('destroy', () => object.disconnect(id));
}

// [min, max] of a GSettings key with a <range>, from the schema itself so the
// limits are written in one place.
function schemaRange(settings, key) {
    const [, limits] = settings.settings_schema.get_key(key).get_range().deep_unpack();

    return limits.deep_unpack();
}

// '#rrggbb' from colour channels in 0 to 1 (a Gdk.RGBA), the form GNOME
// Settings writes for the crosshair colour.
function hexColor({red, green, blue}) {
    const hex = channel => Math.round(channel * BYTE).toString(HEX).padStart(2, '0');

    return `#${hex(red)}${hex(green)}${hex(blue)}`;
}
