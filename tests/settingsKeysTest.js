'use strict';

// Tests for lib/common/settingsKeys.js against the schema itself, so a key
// renamed in one place and not the other fails here rather than at runtime.

const {GLib} = imports.gi;

const Keys = imports.lib.common.settingsKeys;
const {eq, ok} = imports.tests.harness;

const SCHEMA_FILE = 'schemas/org.gnome.shell.extensions.multizoom.gschema.xml';

const repoDir = GLib.path_get_dirname(GLib.path_get_dirname(
    GLib.canonicalize_filename(imports.system.programPath, null)));

const [, bytes] = GLib.file_get_contents(GLib.build_filenamev([repoDir, SCHEMA_FILE]));

const schemaKeys = new Map([...new TextDecoder().decode(bytes).matchAll(/<key name="([^"]+)" type="([^"]+)"/g)]
    .map(([, name, type]) => [name, type]));

for (const key of [Keys.ACTIVE, Keys.DEFAULT_ZOOM, Keys.ZOOM_STEP, Keys.SMOOTH_MOVEMENT, Keys.MONITOR_ZOOMS])
    ok(schemaKeys.has(key), `schema has key ${key}`);

eq(schemaKeys.get(Keys.MONITOR_ZOOMS), Keys.MONITOR_ZOOMS_TYPE, 'monitor-zooms has the type the code writes');

const shortcutKeys = [...schemaKeys].filter(([, type]) => type === 'as').map(([name]) => name);

eq([...Keys.SHORTCUTS].sort().join(), shortcutKeys.sort().join(), 'SHORTCUTS lists every shortcut key in the schema');
