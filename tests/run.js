'use strict';

// Runs every tests/*Test.js file under plain gjs and exits non-zero if any
// assertion failed. Usage: `make test` (or `gjs tests/run.js` from anywhere).

const {Gio, GLib} = imports.gi;

const testsDir = GLib.path_get_dirname(GLib.canonicalize_filename(imports.system.programPath, null));

// Test files import `imports.lib.*` and `imports.tests.*` from the repo root.
imports.searchPath.unshift(GLib.path_get_dirname(testsDir));

const TEST_SUFFIX = 'Test.js';

function testModuleNames() {
    const names = [];
    const children = Gio.File.new_for_path(testsDir).enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);

    for (let info = children.next_file(null); info; info = children.next_file(null)) {
        const file = info.get_name();

        if (file.endsWith(TEST_SUFFIX))
            names.push(file.slice(0, -'.js'.length));
    }

    return names.sort();
}

// Importing a test module runs its assertions.
for (const name of testModuleNames()) {
    print(`- ${name}`);
    void imports.tests[name];
}

const {count, failures} = imports.tests.harness.summary();

print(`${count - failures}/${count} passed`);

if (failures > 0 || count === 0)
    imports.system.exit(1);
