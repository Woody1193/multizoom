'use strict';
/* exported safely, guard */

// Run one cleanup step. A failure is logged and the caller's remaining steps
// still run, so one broken step can't leave the cursor hidden or the desktop
// transparent.
function safely(step) {
    try {
        step();
    } catch (e) {
        logError(e, '[multizoom] cleanup step failed');
    }
}

// Wrap an entry point from GNOME Shell (signal, keybinding, timeout) so an
// exception goes to `onError` instead of escaping into the shell.
//
// Fixed parameters instead of rest args: this also wraps the pointer callback,
// which runs on every pointer movement and must not allocate.
function guard(fn, onError) {
    return (a, b) => {
        try {
            return fn(a, b);
        } catch (e) {
            onError(e);

            return undefined;
        }
    };
}
