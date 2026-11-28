'use strict';

// Tests for lib/common/settingsKeys.js against the schema itself, so a key
// renamed in one place and not the other fails here rather than at runtime.

const {GLib} = imports.gi;

const Keys = imports.lib.common.settingsKeys;
const {LINE_STYLES} = imports.lib.ui.crosshairGeometry;
const {eq, ok} = imports.tests.harness;

const SCHEMA_FILE = 'schemas/org.gnome.shell.extensions.multizoom.gschema.xml';

const repoDir = GLib.path_get_dirname(GLib.path_get_dirname(
    GLib.canonicalize_filename(imports.system.programPath, null)));

// {key name → type} in a schema file.
function keysOf(path) {
    return new Map([...readText(path).matchAll(/<key name="([^"]+)" type="([^"]+)"/g)]
        .map(([, name, type]) => [name, type]));
}

function readText(path) {
    const [, bytes] = GLib.file_get_contents(path);

    return new TextDecoder().decode(bytes);
}

const schemaPath = GLib.build_filenamev([repoDir, SCHEMA_FILE]);
const schemaKeys = keysOf(schemaPath);

const ownKeys = [
    Keys.ACTIVE,
    Keys.DEFAULT_ZOOM,
    Keys.ZOOM_STEP,
    Keys.SMOOTH_MOVEMENT,
    Keys.MONITOR_ZOOMS,
    Keys.CROSSHAIR_LINES,
    Keys.CROSSHAIR_CIRCLE,
    Keys.CROSSHAIR_CIRCLE_RADIUS,
];

for (const key of ownKeys)
    ok(schemaKeys.has(key), `schema has key ${key}`);

eq(schemaKeys.get(Keys.MONITOR_ZOOMS), Keys.MONITOR_ZOOMS_TYPE, 'monitor-zooms has the type the code writes');

// The crosshair line styles the code knows are exactly the schema's choices.
const lineChoices = readText(schemaPath).match(/<key name="crosshair-lines"[\s\S]*?<\/choices>/)[0];

eq([...lineChoices.matchAll(/<choice value="([^"]+)"/g)].map(([, v]) => v).join(), LINE_STYLES.join(),
    'LINE_STYLES matches the crosshair-lines choices');

const shortcutKeys = [...schemaKeys].filter(([, type]) => type === 'as').map(([name]) => name);

eq([...Keys.SHORTCUTS].sort().join(), shortcutKeys.sort().join(), 'SHORTCUTS lists every shortcut key in the schema');

// GNOME's magnifier schema, which ships with gsettings-desktop-schemas.
const magnifierKeys = keysOf(`/usr/share/glib-2.0/schemas/${Keys.MAGNIFIER_SCHEMA}.gschema.xml`);

for (const key of Object.values(Keys.CROSSHAIRS))
    ok(magnifierKeys.has(key), `GNOME's magnifier schema has key ${key}`);
