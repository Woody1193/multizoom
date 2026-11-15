'use strict';
/* exported focusRect, caretRect */

// Screen rectangles for AT-SPI focus and text-cursor events. Adapted from
// GNOME Shell 42's ZoomRegion._convertExtentsToScreenSpace (ui/magnifier.js),
// which is private.
//
// Every AT-SPI call here is a blocking D-Bus round trip to the application
// (up to 250 ms each), so callers must rule events out cheaply before calling
// these. Any of them may throw if the application is slow or gone.

const {Atspi, St} = imports.gi;

const FOCUS_GAINED = 1;

const TOPLEVEL_ROLES = new Set([
    Atspi.Role.FRAME,
    Atspi.Role.DIALOG,
    Atspi.Role.WINDOW,
]);

// {x, y, width, height} in screen pixels for the component that just gained
// focus, or null when it shouldn't be followed.
function focusRect(event, window) {
    const component = event.source.get_component_iface();

    if (event.detail1 !== FOCUS_GAINED || !component)
        return null;

    return toScreen(event.source, component.get_extents(Atspi.CoordType.WINDOW), window);
}

// Screen rectangle of the character at the text cursor, or null.
function caretRect(event, window) {
    const text = event.source.get_text_iface();

    if (!text)
        return null;

    const extents = text.get_character_extents(text.get_caret_offset(), Atspi.CoordType.WINDOW);

    // 0×0 means the application couldn't place the offset; GNOME ignores
    // these too.
    if (extents.width === 0 && extents.height === 0)
        return null;

    return toScreen(event.source, extents, window);
}

// Window-relative extents to screen pixels. Only for the focused widget of
// the active window: some widgets claim focus when their window doesn't
// have it.
function toScreen(accessible, extents, window) {
    if (!isFocusedInActiveWindow(accessible))
        return null;

    let rect = window.get_frame_rect();

    if (!window.is_client_decorated())
        rect = window.frame_rect_to_client_rect(rect);

    const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;

    return {
        x: rect.x + scale * extents.x,
        y: rect.y + scale * extents.y,
        width: scale * extents.width,
        height: scale * extents.height,
    };
}

function isFocusedInActiveWindow(accessible) {
    if (!accessible.get_state_set().contains(Atspi.StateType.FOCUSED))
        return false;

    const toplevel = toplevelOf(accessible);

    return toplevel !== null && toplevel.get_state_set().contains(Atspi.StateType.ACTIVE);
}

// The outermost window-like ancestor below the application, or null.
function toplevelOf(accessible) {
    let toplevel = null;

    for (let node = accessible; node; node = node.get_parent()) {
        const role = node.get_role();

        if (role === Atspi.Role.APPLICATION)
            break;

        if (TOPLEVEL_ROLES.has(role))
            toplevel = node;
    }

    return toplevel;
}
