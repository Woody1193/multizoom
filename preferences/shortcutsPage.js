'use strict';
/* exported ShortcutsPage */

const {Adw} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const Keys = Me.imports.lib.common.settingsKeys;
const {ShortcutRow} = Me.imports.preferences.shortcutRow;
const {ShortcutSources} = Me.imports.preferences.shortcutSources;

// The "Keyboard Shortcuts" page: every MultiZoom shortcut, edited the way
// GNOME Settings edits the desktop's, checked against the desktop's own.
var ShortcutsPage = class ShortcutsPage {
    constructor(settings) {
        const sources = new ShortcutSources(settings);

        const group = new Adw.PreferencesGroup({
            title: 'Keyboard Shortcuts',
            description: 'Select a shortcut to change it.',
        });

        for (const key of Keys.SHORTCUTS)
            group.add(new ShortcutRow(settings, key, sources).row);

        this.page = new Adw.PreferencesPage({title: 'Keyboard Shortcuts', icon_name: 'input-keyboard-symbolic'});
        this.page.add(group);
    }
};
