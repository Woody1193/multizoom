'use strict';
/* exported init, fillPreferencesWindow */

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {ShortcutsPage} = Me.imports.preferences.shortcutsPage;
const {ZoomPage} = Me.imports.preferences.zoomPage;

// The preferences window (GTK 4 and libadwaita, in its own process, never
// inside GNOME Shell). Every change is saved to GSettings at once and the
// running extension picks it up from there.

function init() {
    // Nothing to set up; GNOME requires the function.
}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings();

    window.add(new ZoomPage(settings).page);
    window.add(new ShortcutsPage(settings).page);

    // Keep the settings object alive for as long as the window.
    window._settings = settings;
}
