'use strict';
/* exported findConflict */

// Which other shortcut already uses an accelerator, for the preferences
// window's "already being used" warning. Pure, so it runs under plain `gjs`
// for the unit tests; the window normalises accelerators (Gtk) first.

// bindings: [{id, title, accels: [normalised accelerator, …]}]. Returns the
// first binding other than `exceptId` that uses `accel`, or null.
function findConflict(accel, bindings, exceptId) {
    return bindings.find(b => b.id !== exceptId && b.accels.includes(accel)) ?? null;
}
