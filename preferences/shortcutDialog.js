'use strict';
/* exported ShortcutDialog */

const {Adw, Gdk, Gtk} = imports.gi;

const DIALOG_WIDTH = 440;
const MARGIN = 24;
const SPACING = 18;
const KEYBOARD_ICON_SIZE = 96;

// The "Set Shortcut" dialog, laid out like GNOME Settings' keyboard panel:
// press a combination to set it, Esc to cancel, Backspace to disable. A
// combination already in use shows who has it and offers to replace it,
// which disables the other shortcut.
//
// shortcut: {
//     title,                 the name shown in the prompt
//     conflictWith(accel),   the binding {id, title} already using accel, or null
//     set(accels),           save the shortcut's accelerators
//     disable(id),           remove another binding's accelerators
// }
var ShortcutDialog = class ShortcutDialog {
    constructor(parent, shortcut) {
        this._shortcut = shortcut;
        this._accel = null;
        this._conflict = null;

        this.window = new Adw.Window({
            modal: true,
            transient_for: parent,
            resizable: false,
            default_width: DIALOG_WIDTH,
            title: 'Set Shortcut',
        });

        this.window.set_content(this._content());
        this._listenForKeys();
    }

    show() {
        this.window.present();
    }

    _content() {
        const box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});

        box.append(this._headerBar());
        box.append(this._body());

        return box;
    }

    _headerBar() {
        const header = new Adw.HeaderBar({show_start_title_buttons: false, show_end_title_buttons: false});
        const cancel = new Gtk.Button({label: 'Cancel'});

        this._replace = new Gtk.Button({label: 'Replace', visible: false, css_classes: ['destructive-action']});

        cancel.connect('clicked', () => this.window.close());
        this._replace.connect('clicked', () => this._replaceConflict());
        header.pack_start(cancel);
        header.pack_end(this._replace);

        return header;
    }

    _body() {
        const body = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: SPACING,
            margin_top: MARGIN,
            margin_bottom: MARGIN,
            margin_start: MARGIN,
            margin_end: MARGIN,
        });

        body.append(wrappedLabel(`Press the key combination to set the shortcut for “${this._shortcut.title}”.`));
        body.append(this._stack());

        return body;
    }

    // Before a key: a keyboard and the Esc/Backspace hint. After a
    // combination that is taken: the combination and the conflict.
    _stack() {
        this._pages = new Gtk.Stack();
        this._pages.add_named(this._waitingPage(), 'waiting');
        this._pages.add_named(this._conflictPage(), 'conflict');

        return this._pages;
    }

    _waitingPage() {
        const page = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: SPACING});

        page.append(new Gtk.Image({icon_name: 'input-keyboard-symbolic', pixel_size: KEYBOARD_ICON_SIZE, css_classes: ['dim-label']}));

        page.append(wrappedLabel('Press Esc to cancel or Backspace to disable the keyboard shortcut.',
            ['dim-label']));

        return page;
    }

    _conflictPage() {
        const page = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, spacing: SPACING});

        this._pressed = new Gtk.ShortcutLabel({halign: Gtk.Align.CENTER});
        this._conflictText = wrappedLabel('', ['dim-label']);
        page.append(this._pressed);
        page.append(this._conflictText);

        return page;
    }

    // Keys reach the dialog first, and the desktop's own shortcuts are held
    // back while it's open so they can be picked.
    _listenForKeys() {
        const keys = new Gtk.EventControllerKey({propagation_phase: Gtk.PropagationPhase.CAPTURE});

        keys.connect('key-pressed', (controller, keyval, keycode, state) => this._onKey(keyval, state));
        this.window.add_controller(keys);
        this.window.connect('map', () => this.window.get_surface().inhibit_system_shortcuts(null));
        this.window.connect('unmap', () => this.window.get_surface().restore_system_shortcuts());
    }

    _onKey(keyval, state) {
        const mods = state & Gtk.accelerator_get_default_mod_mask();
        const key = Gdk.keyval_to_lower(keyval);

        if (mods === 0 && key === Gdk.KEY_Escape)
            this.window.close();
        else if (mods === 0 && key === Gdk.KEY_BackSpace)
            this._finish([]);
        else if (isShortcut(key, mods))
            this._offer(Gtk.accelerator_name(key, mods));

        return Gdk.EVENT_STOP;
    }

    // Set a free combination at once; show who has a taken one.
    _offer(accel) {
        const conflict = this._shortcut.conflictWith(accel);

        if (conflict === null) {
            this._finish([accel]);

            return;
        }

        const label = Gtk.accelerator_get_label(...Gtk.accelerator_parse(accel).slice(1));

        this._accel = accel;
        this._conflict = conflict;
        this._pressed.accelerator = accel;
        this._conflictText.label = `${label} is already being used for ${conflict.title}. ` +
            `If you replace it, ${conflict.title} will be disabled`;

        this._pages.visible_child_name = 'conflict';
        this._replace.visible = true;
    }

    _replaceConflict() {
        this._shortcut.disable(this._conflict.id);
        this._finish([this._accel]);
    }

    _finish(accels) {
        this._shortcut.set(accels);
        this.window.close();
    }
};

function wrappedLabel(text, cssClasses = []) {
    return new Gtk.Label({label: text, wrap: true, justify: Gtk.Justification.CENTER, css_classes: cssClasses});
}

// Whether a key press can be a shortcut. As in GNOME Settings, a plain key
// or Shift+key would get in the way of typing, so it needs another modifier,
// unless it's a function key.
function isShortcut(keyval, mods) {
    const isFunctionKey = keyval >= Gdk.KEY_F1 && keyval <= Gdk.KEY_F35;
    const hasModifier = (mods & ~Gdk.ModifierType.SHIFT_MASK) !== 0;

    return Gtk.accelerator_valid(keyval, mods) && (hasModifier || isFunctionKey);
}
