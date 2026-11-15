'use strict';
/* exported Cursor */

const {Clutter, Meta} = imports.gi;
const Magnifier = imports.ui.magnifier;

// Hides the real cursor and draws its image inside whichever monitor view the
// pointer is on, scaled with that view. The real cursor would sit at the real
// (unzoomed) position, which doesn't match the zoomed picture.
var Cursor = class Cursor {
    constructor() {
        this._tracker = Meta.CursorTracker.get_for_display(global.display);

        // GNOME's own sprite content: it handles HiDPI cursor textures.
        this._content = new Magnifier.MouseSpriteContent();
        this.actor = new Clutter.Actor({
            name: 'multizoom-cursor',
            request_mode: Clutter.RequestMode.CONTENT_SIZE,
            content: this._content,
        });

        this._hotX = 0; // hotspot, in cursor texture pixels
        this._hotY = 0;

        // `visibility-changed`: something (another extension, a client)
        // showed the real cursor again.
        this._tracker.connectObject(
            'cursor-changed', () => this._updateSprite(),
            'visibility-changed', () => this._keepHidden(),
            this);

        this._updateSprite();
        this._tracker.set_pointer_visible(false);
    }

    _updateSprite() {
        const sprite = this._tracker.get_sprite();

        this._content.texture = sprite;
        [this._hotX, this._hotY] = this._tracker.get_hot();

        // An app can hide the pointer (e.g. a video player); follow that.
        this.actor.visible = sprite !== null;
    }

    _keepHidden() {
        if (this._tracker.get_pointer_visible())
            this._tracker.set_pointer_visible(false);
    }

    // Draw the pointer with its hotspot at view pixel (x, y) inside `parent`.
    // Called on every pointer movement: only sets properties.
    place(parent, x, y, zoom) {
        if (this.actor.get_parent() !== parent) {
            this.detach();
            parent.add_child(this.actor);
        }

        // Hotspot in texture pixels → logical pixels → zoomed view pixels.
        const k = zoom / this._content.scale;

        this.actor.set_scale(zoom, zoom);
        this.actor.set_position(Math.round(x - this._hotX * k), Math.round(y - this._hotY * k));
    }

    // Take the image out of its view, e.g. before that view is destroyed.
    detach() {
        const parent = this.actor.get_parent();

        if (parent)
            parent.remove_child(this.actor);
    }

    destroy() {
        this._tracker.disconnectObject(this);
        this._tracker.set_pointer_visible(true);
        this.actor.destroy();
        this.actor = null;
        this._content = null;
    }
};
