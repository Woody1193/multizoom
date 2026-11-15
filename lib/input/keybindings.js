'use strict';
/* exported Keybindings */

const {Meta, Shell} = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {safely} = Me.imports.lib.common.safety;

// Registers a set of global shortcuts and removes them all in destroy().
// `actions` maps each settings key (an `as` key holding the accelerators, so
// users can rebind them) to its handler.
var Keybindings = class Keybindings {
    constructor(settings, actions) {
        this._names = [];

        for (const [name, handler] of Object.entries(actions)) {
            Main.wm.addKeybinding(name, settings, Meta.KeyBindingFlags.NONE, Shell.ActionMode.ALL, handler);
            this._names.push(name);
        }
    }

    destroy() {
        for (const name of this._names)
            safely(() => Main.wm.removeKeybinding(name));

        this._names = [];
    }
};
