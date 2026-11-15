# multizoom

Linux zoom utility that doesn't suck

MultiZoom is a screen magnifier for GNOME Shell that zooms each monitor on its own. GNOME's built-in zoom treats all monitors as one big screen, so half of what you're looking at ends up on the next monitor. MultiZoom gives every monitor its own zoomed view.

Works on GNOME Shell 42 (Ubuntu and Pop!_OS 22.04), tested on X11.

## Features

- **Per-monitor zoom.** Each monitor has its own zoom level, from 100% to 1600%, changed with the shortcuts below.
- **Only the active monitor moves.** The monitor under the pointer follows it; the other monitors keep their view.
- **Edge-to-edge tracking.** The pointer's position across the monitor matches its position across the view, so every edge and corner is reachable. Moving off a monitor quickly still leaves that monitor showing the edge you crossed.
- **Follows keyboard focus and the text cursor.** Once the pointer has been still for a quarter of a second, a monitor's view follows Tab focus and typing on it, so what you're working on stays in view. It uses the same edge-to-edge mapping as the pointer, so clicking into text doesn't move the view. Works in GTK apps; Chrome and Electron apps only report focus with GNOME's `toolkit-accessibility` setting on.
- **Lock a monitor.** A locked view stays put even while the pointer or focus is on that monitor, for example to keep a large dialog or a reference document in view. The pointer can move outside what you can see; clicks still land where the pointer really is.
- **Remembers zoom levels per physical monitor.** Each monitor keeps its zoom level across zoom off and on, screen locks and restarts. Monitors are recognised by the maker, model and serial number they report, so a monitor keeps its level wherever it's plugged in or placed. Moving between a desk and a conference room just works: the laptop screen and each external display or projector remember their own level. Monitors that report no serial (many laptop panels) are told apart by port. A monitor MultiZoom hasn't seen before starts at 200% (`default-zoom`). Lock isn't remembered.
- **Readable feedback on screen.** A large badge in each monitor's top-right corner, drawn unzoomed, shows "Locked" while that view is locked and the new zoom level for a moment after it changes. While zoom is on, the top panel shows the zoom level of the monitor under the pointer (`Zoom 200%`), with a lock icon when that monitor is locked.
- **Safe to rely on.** If MultiZoom hits an error, it switches itself off and turns on GNOME's built-in zoom, so you're never left unzoomed or without a cursor. Turning on GNOME's own zoom (Super+Alt+8) always switches MultiZoom off. When the screen locks while you're zoomed, GNOME's zoom stays on at the password prompt.
- **Light on the desktop.** Pointer tracking does no allocation per movement, and the blocking accessibility lookups for focus only run when their result would be used (pointer resting, monitor unlocked and zoomed).

## Shortcuts

| Shortcut | Action |
| --- | --- |
| Super+Alt+Z | Turn zoom on or off (all monitors) |
| Super+Alt+Up | Zoom in on the monitor under the pointer |
| Super+Alt+Down | Zoom out on the monitor under the pointer |
| Super+Alt+K | Lock or unlock the view on the monitor under the pointer |
| Super+Alt+Shift+K | Unlock every monitor |

Each zoom step adds or removes 25% (the `zoom-step` setting), so levels stay round: 200%, 225%, 250%. Zoom in, zoom out and lock act on a running zoom only.

## Settings

Open the settings window from the Extensions app, or run:

```sh
gnome-extensions prefs multizoom@woody1193.github.io
```

It works like GNOME Settings, and every change applies straight away:

- **Zoom:** switch zoom on or off, and set the default magnification and the zoom step.
- **Displays:** every display MultiZoom remembers, whether it's connected, and its magnification. Change a level, or forget a display so it starts at the default next time.
- **Keyboard Shortcuts:** select a shortcut and press the new keys. Esc cancels and Backspace disables it. A combination already used by the desktop shows who has it and offers to replace it.

Behind the window, all settings are GSettings keys in `org.gnome.shell.extensions.multizoom`:

| Key | Default | Meaning |
| --- | --- | --- |
| `default-zoom` | `2.0` | Zoom level for a monitor seen for the first time |
| `zoom-step` | `0.25` | Amount added or removed by each zoom in or out (0.25 = 25%) |
| `toggle-zoom`, `zoom-in`, `zoom-out`, `toggle-lock`, `unlock-all` | see Shortcuts | Shortcut for each action |
| `active` | `false` | Whether zoom is on; kept across restarts |
| `monitor-zooms` | `{}` | Saved zoom level per physical monitor |

For example, to rebind lock:

```sh
gsettings --schemadir ~/.local/share/gnome-shell/extensions/multizoom@woody1193.github.io/schemas \
    set org.gnome.shell.extensions.multizoom toggle-lock "['<Super><Alt>l']"
```

## Install

MultiZoom is packaged for Ubuntu and Pop!_OS 22.04 (GNOME Shell 42). Add its apt repository once, and updates then arrive with your normal system updates:

```sh
sudo curl -fsSLo /etc/apt/keyrings/multizoom.gpg https://woody1193.github.io/multizoom/multizoom.gpg
echo "deb [signed-by=/etc/apt/keyrings/multizoom.gpg] https://woody1193.github.io/multizoom ./" \
    | sudo tee /etc/apt/sources.list.d/multizoom.list
sudo apt update && sudo apt install gnome-shell-extension-multizoom
```

Each release's `.deb` and zip are also attached to its [GitHub release](https://github.com/Woody1193/multizoom/releases).

Then restart GNOME Shell (on X11: Alt+F2, type `r`, Enter; on Wayland: log out and back in) and enable it:

```sh
gnome-extensions enable multizoom@woody1193.github.io
```

Press Super+Alt+Z to start zooming.

### From a clone

```sh
make install   # symlinks into ~/.local/share/gnome-shell/extensions and compiles the settings schema
```

A copy in `~/.local/share/gnome-shell/extensions` takes priority over the package, so run `make uninstall` before switching to the package.

## Development

Requires Node 22 (see `.nvmrc`), [pre-commit](https://pre-commit.com), `gjs` and `glib-compile-schemas`.

```sh
npm ci               # linters
pre-commit install   # git hooks
make test            # unit tests
pre-commit run --all-files
```

Rules for contributors (and AI agents) are in [AGENTS.md](AGENTS.md).
