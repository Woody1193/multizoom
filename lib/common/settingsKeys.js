'use strict';
/* exported ACTIVE, DEFAULT_ZOOM, ZOOM_STEP, SMOOTH_MOVEMENT, MONITOR_ZOOMS, MONITOR_ZOOMS_TYPE, SHORTCUTS,
   INTERFACE_SCHEMA, ENABLE_ANIMATIONS */

// MultiZoom's GSettings keys (schemas/*.gschema.xml), shared by the extension
// and the preferences window so each name is written once.

var ACTIVE = 'active';
var DEFAULT_ZOOM = 'default-zoom';
var ZOOM_STEP = 'zoom-step';
var SMOOTH_MOVEMENT = 'smooth-movement';
var MONITOR_ZOOMS = 'monitor-zooms';
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
