'use strict';
/* exported ACTIVE, DEFAULT_ZOOM, ZOOM_STEP, SMOOTH_MOVEMENT, MONITOR_ZOOMS, MONITOR_ZOOMS_TYPE, SHORTCUTS,
   INTERFACE_SCHEMA, ENABLE_ANIMATIONS, MAGNIFIER_SCHEMA, CROSSHAIRS, CROSSHAIR_LINES, CROSSHAIR_CIRCLE,
   CROSSHAIR_CIRCLE_RADIUS */

// MultiZoom's GSettings keys (schemas/*.gschema.xml), shared by the extension
// and the preferences window so each name is written once.

var ACTIVE = 'active';
var DEFAULT_ZOOM = 'default-zoom';
var ZOOM_STEP = 'zoom-step';
var SMOOTH_MOVEMENT = 'smooth-movement';
var MONITOR_ZOOMS = 'monitor-zooms';

// MultiZoom's additions to GNOME's crosshairs (CROSSHAIRS below).
var CROSSHAIR_LINES = 'crosshair-lines';
var CROSSHAIR_CIRCLE = 'crosshair-circle';
var CROSSHAIR_CIRCLE_RADIUS = 'crosshair-circle-radius';
var MONITOR_ZOOMS_TYPE = 'a{sd}';

// Shortcut keys (type `as`), in the order the preferences window lists them.
// Their titles are the schema summaries.
var SHORTCUTS = [
    'toggle-zoom',
    'zoom-in',
    'zoom-out',
    'toggle-lock',
    'unlock-all',
];

// GNOME's own "Animations" switch; MultiZoom doesn't glide while it's off.
var INTERFACE_SCHEMA = 'org.gnome.desktop.interface';
var ENABLE_ANIMATIONS = 'enable-animations';

// GNOME's magnifier settings. MultiZoom draws crosshairs from GNOME's own
// keys, so GNOME Settings (Accessibility → Zoom → Crosshairs) and the
// preferences window change the same thing.
var MAGNIFIER_SCHEMA = 'org.gnome.desktop.a11y.magnifier';

var CROSSHAIRS = {
    SHOW: 'show-cross-hairs',
    COLOR: 'cross-hairs-color',
    THICKNESS: 'cross-hairs-thickness',
    OPACITY: 'cross-hairs-opacity',
    LENGTH: 'cross-hairs-length',
    CLIP: 'cross-hairs-clip',
};
