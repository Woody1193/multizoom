# AGENTS.md

Rules for anyone (human or AI agent) changing this repository. Read this before writing code.

## What this is

MultiZoom is a GNOME Shell extension that zooms each monitor independently:

- Only the monitor with the pointer or keyboard focus follows it; other monitors keep their view.
- Any monitor can be **locked**, freezing its view even while the pointer is on it. The pointer may move outside the visible area of a locked monitor; that is intended.

People rely on this to see their screen. A bug here is not cosmetic: it can leave someone unable to use their computer. Treat safety and teardown rules below as hard requirements.

## Target platform

- **GNOME Shell 42 / GJS 1.72 (SpiderMonkey 91)**, as shipped in Ubuntu and Pop!_OS 22.04. Do not use JS features newer than ES2022 or APIs added after GNOME 42.
- **Module system:** the legacy `imports.*` system, not ES modules.
  - Top-level `var` declarations are a file's exports; list them in a `/* exported ... */` comment.
  - Import the extension's own files via `ExtensionUtils.getCurrentExtension().imports.lib.<file>`.
  - GNOME 45+ requires ES modules. Keep `gi`/Shell imports at the top of each file so that port stays mechanical.
- **Primary session: X11.** Nothing may break under Wayland, even where Wayland behaviour is untested.

## Layout

| Path | Purpose |
| --- | --- |
| `extension.js` | Entry point: `init`/`enable`/`disable`, keybindings, wiring, fail-safe. |
| `lib/viewport.js` | Pure geometry (tracking, centring, clamping). **No `gi` imports**: it must run under plain `gjs` for the tests. |
| `lib/*.js` | One concern per file (monitor view actors, cursor, pointer source, focus tracking). |
| `schemas/*.gschema.xml` | GSettings: shortcuts and preferences. |
| `tests/` | Unit tests, run with plain `gjs`. |
| `metadata.json` | Extension metadata; `shell-version` must list every version actually tested. |

## Commands

```sh
npm ci                # install linters (once, and after package.json changes)
pre-commit install    # enable the git hooks (once per clone)
make test             # unit tests
npm run lint          # ESLint, zero warnings allowed
pre-commit run --all-files   # every gate CI runs
make install          # symlink into ~/.local/share/gnome-shell/extensions and compile schemas
make pack             # build an installable zip in dist/
```

**Dev loop:**

1. `make install`.
2. Restart GNOME Shell: on X11, Alt+F2, `r`. On Wayland you must log out and back in.
3. `gnome-extensions enable multizoom@woody1193.github.io`.
4. Watch logs with `journalctl -f -o cat /usr/bin/gnome-shell`.

## Quality gates

Automated gates are how this project keeps its baseline. They are not optional.

- **Never bypass hooks.** Don't use `git commit --no-verify` or `SKIP=` locally. If a hook is wrong, fix the hook in its own commit.
- **Zero lint warnings.** Fix the code, not the rule. An `eslint-disable` comment needs a one-line reason on the same line and must name the specific rule.
- **CI must be green before merge:**
  - `lint.yml` runs every pre-commit hook except the unit tests;
  - `test.yml` runs the unit tests on Ubuntu 22.04's GJS.
- **Test what can be tested.** Logic that can live in a pure function belongs in `lib/viewport.js` (or another `gi`-free module) with unit tests. Every bug fix in pure logic comes with a test that failed before the fix.
- **Manual verification is still required** for anything touching actors, input or teardown. Describe what you checked in the pull request.

## Code rules

### Teardown (every resource has an owner and a release)

- Every signal connection is released on teardown. Prefer `connectObject(..., this)` / `disconnectObject(this)` on GObjects. For non-GObject emitters (e.g. `FocusCaretTracker`), keep the handler ids and disconnect them.
- Every `GLib.timeout_add`/`idle_add` id is stored and removed with `GLib.source_remove` on teardown.
- Every actor added to the stage is destroyed on teardown. Detach shared actors (the cursor image) before destroying their parent.
- `disable()` must return the desktop exactly to how it was:
  - cursor visible;
  - `Main.uiGroup` opacity 255;
  - unredirection re-enabled;
  - keybindings removed;
  - the built-in magnifier restored if we turned it off.
- `disable()` followed by `enable()`, repeated many times, must not grow gnome-shell's memory.

### Fail-safe

- Every entry point from GNOME Shell (signal handlers, keybinding handlers, timeouts) runs through the extension's guard.
- On an exception, the guard tears down and hands off to the built-in magnifier, so the user is never left unzoomed or with a hidden cursor.
- Teardown steps are individually guarded so one failure doesn't skip the rest.

### Performance (gnome-shell has one main thread; anything slow freezes the whole desktop)

- The pointer-motion path must not allocate: no new objects, arrays, closures or timers per event. Mutate preallocated state and set actor properties.
- Never make a blocking call (AT-SPI, D-Bus, file I/O) unless its result will be used. Do the cheap checks first, e.g. skip focus extents when the target monitor is locked.
- No polling faster than the display refresh rate.

### Accessibility

- Feedback must be visible on the zoomed screen. Draw indicators inside our own per-monitor view (not zoomed), not only through the shell OSD, which may be outside the visible area.
- All shortcuts live in GSettings so users can rebind them. Defaults must not collide with GNOME's accessibility shortcuts (Super+Alt+8, =, −, S).
- Never steal the built-in magnifier's escape hatch: enabling the built-in magnifier (Super+Alt+8) must switch MultiZoom off.

### Style

- ESLint enforces the style (GNOME Shell conventions: 4-space indent, single quotes, no spaces inside braces). `.editorconfig` covers the rest.
- Comments explain *why*, not *what*. Name units (screen pixels vs view pixels, µs vs ms) in names or comments.

## Git workflow

- `main` is protected by CI. Work on a branch; open a pull request; merge only when both workflows pass.
- Small, focused commits with imperative subjects of 72 characters or fewer (e.g. `Lock view per monitor`). Explain *why* in the body when it isn't obvious.
- Don't commit generated files: `schemas/gschemas.compiled`, `dist/`, `node_modules/`.
- When adding a tool, add it to both pre-commit and CI, and pin its version.
