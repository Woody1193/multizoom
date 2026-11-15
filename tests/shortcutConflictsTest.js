'use strict';

// Tests for preferences/shortcutConflicts.js. Run all tests with `make test`.

const {findConflict} = imports.preferences.shortcutConflicts;
const {eq} = imports.tests.harness;

const bindings = [
    {id: 'multizoom/toggle-zoom', title: 'Turn zoom on or off', accels: ['<Super><Alt>z']},
    {id: 'wm/close', title: 'Close window', accels: ['<Super>q', '<Alt>F4']},
];

eq(findConflict('<Alt>F4', bindings, 'multizoom/zoom-in')?.title, 'Close window', 'finds any of a binding\'s accelerators');
eq(findConflict('<Super><Alt>z', bindings, 'multizoom/toggle-zoom'), null, 'a shortcut doesn\'t conflict with itself');
eq(findConflict('<Super><Alt>y', bindings, 'multizoom/zoom-in'), null, 'unused accelerator: no conflict');
