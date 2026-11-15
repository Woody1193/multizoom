'use strict';
/* exported ZoomIndicator */

const {Clutter, St} = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {badgeText} = Me.imports.lib.ui.badgeText;

// Key in Main.panel.statusArea; must be unique across extensions.
const STATUS_AREA_ROLE = 'multizoom';
const ACCESSIBLE_NAME = 'MultiZoom';
const LOCK_ICON = 'changes-prevent-symbolic';

// Leftmost slot of the panel's right-hand box, next to the other indicators.
const PANEL_POSITION = 0;
const PANEL_BOX = 'right';

// Top-panel indicator showing the zoom level of the monitor under the
// pointer, with a lock icon when that monitor is locked. Exists only while
// zoom is on.
var ZoomIndicator = class ZoomIndicator {
    constructor() {
        this._zoom = null;
        this._locked = null;

        // No menu: the indicator only displays state.
        this._button = new PanelMenu.Button(0, ACCESSIBLE_NAME, true);

        const box = new St.BoxLayout({style_class: 'panel-status-menu-box'});

        this._lockIcon = new St.Icon({icon_name: LOCK_ICON, style_class: 'system-status-icon', visible: false});
        this._label = new St.Label({y_align: Clutter.ActorAlign.CENTER});

        box.add_child(this._lockIcon);
        box.add_child(this._label);
        this._button.add_child(box);
        Main.panel.addToStatusArea(STATUS_AREA_ROLE, this._button, PANEL_POSITION, PANEL_BOX);
    }

    // Show a monitor's {zoom, locked}. Called on every pointer movement, so
    // it only touches the actors when something changed.
    show(state) {
        if (state.zoom === this._zoom && state.locked === this._locked)
            return;

        this._zoom = state.zoom;
        this._locked = state.locked;
        this._label.text = badgeText(false, state.zoom);
        this._lockIcon.visible = state.locked;
    }

    // The panel drops it from statusArea when it is destroyed.
    destroy() {
        this._button.destroy();
        this._button = null;
    }
};
