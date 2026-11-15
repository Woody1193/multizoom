# multizoom

Linux zoom utility that doesn't suck

## Shortcuts

| Shortcut | Action |
| --- | --- |
| Super+Alt+Z | Turn zoom on or off (all monitors) |
| Super+Alt+Up | Zoom in on the monitor under the pointer |
| Super+Alt+Down | Zoom out on the monitor under the pointer |
| Super+Alt+K | Lock or unlock the view on the monitor under the pointer |
| Super+Alt+Shift+K | Unlock every monitor |

Each zoom step multiplies or divides the zoom by 1.25 (the `zoom-step` setting). A badge in the monitor's top-right corner shows "Locked" while that view is locked, and the zoom level for a moment after it changes. While zoom is on, the top panel shows the zoom level of the monitor under the pointer, with a lock icon when that monitor is locked.

When the pointer is still, a monitor's view also follows the keyboard focus and the text cursor on it, so typing and Tab keep what you're working on in view. Locked monitors and monitors at 100% ignore focus.

A locked view stays put even while the pointer is on its monitor, so the pointer can move outside what you can see. Clicks still land where the pointer really is.

Shortcuts are GSettings keys, so they can be rebound, for example:

```sh
gsettings --schemadir ~/.local/share/gnome-shell/extensions/multizoom@woody1193.github.io/schemas \
    set org.gnome.shell.extensions.multizoom toggle-lock "['<Super><Alt>l']"
```

Turning on GNOME's own zoom (Super+Alt+8) always switches MultiZoom off.

## Development

Requires Node 22 (see `.nvmrc`), [pre-commit](https://pre-commit.com), `gjs` and `glib-compile-schemas`.

```sh
npm ci               # linters
pre-commit install   # git hooks
make test            # unit tests
pre-commit run --all-files
```

Rules for contributors (and AI agents) are in [AGENTS.md](AGENTS.md).
