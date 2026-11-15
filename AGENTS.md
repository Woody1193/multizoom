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
| `extension.js` | Composition root: settings, keybindings, fail-safe, switching zoom on and off. No zoom logic of its own. |
| `lib/zoom/` | The zoom itself. `zoomSession.js`: one period of zoom being on; takes over the screen in its constructor, gives it back in `destroy()`, and routes pointer, focus and shortcuts to monitors in between. `monitorSet.js`: the current monitors with their states and views. `viewport.js`: the view maths (pure). `builtinMagnifier.js`: hand-off with GNOME's own magnifier. |
| `lib/monitors/` | Which monitor is which, and what it remembers. `monitorIds.js`: the physical monitor (EDID vendor, product, serial) at each place, from Mutter's DisplayConfig. `monitorIdentity.js`: the id rules (pure). `monitorStates.js`: zoom and lock per monitor, and saving levels (pure). `monitorLabel.js`: display names for saved monitors (pure). |
| `lib/input/` | What to follow. `pointer.js`: the pointer source. `focusWatch.js`, `accessibleExtents.js`: keyboard focus and the text cursor (AT-SPI), gated so blocking lookups only run when needed. `keybindings.js`: the global shortcuts. |
| `lib/ui/` | Everything MultiZoom draws. `monitorView.js`: one monitor's zoomed view. `cursor.js`: the drawn cursor. `viewBadge.js`: the badge inside each view. `zoomIndicator.js`: the top-panel indicator. `badgeText.js`: their wording (pure). |
| `lib/common/` | Shared by everything. `safety.js`: `safely` (cleanup steps) and `guard` (entry points). `settingsKeys.js`: the settings key names, also used by the preferences window. |
| `prefs.js`, `preferences/` | The preferences window (GTK 4, libadwaita). The folder must not be called `prefs/`: GNOME 42 would load it instead of `prefs.js`. Runs in its own process, never inside GNOME Shell: never import `Main`, `St`, `Shell` or `Meta` there. `shortcutConflicts.js` is pure. |
| Pure modules (marked above) | **No `gi` imports and no module imports** (inject dependencies instead), so they run under plain `gjs` for the tests. |
| `packaging/` | The Debian package: `control.in` (filled in by `make deb`) and `build-apt-repo.sh` (the signed apt repository the release workflow publishes). |
| `schemas/*.gschema.xml` | GSettings: shortcuts and preferences. |
| `tests/` | `run.js` runs every `*Test.js`; `harness.js` has the shared assertions. |
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
make deb              # build a .deb in dist/ from the same files
```

**Dev loop:**

1. `make install`.
2. Restart GNOME Shell: on X11, Alt+F2, `r`. On Wayland you must log out and back in.
3. `gnome-extensions enable multizoom@woody1193.github.io`.
4. Watch logs with `journalctl -f -o cat /usr/bin/gnome-shell`.

## Quality gates

Automated gates are how this project keeps its baseline. They are not optional.

- **Never bypass hooks.** Don't use `git commit --no-verify` or `SKIP=` locally. If a hook is wrong, fix the hook in its own commit.
- **No duplication.** jscpd fails the commit on any repeated block of 5 lines / 40 tokens or more (`.jscpd.json`). Extract the shared code; don't raise the threshold.
- **Zero lint warnings.** Fix the code, not the rule. An `eslint-disable` comment needs a one-line reason on the same line and must name the specific rule.
- **CI must be green before merge:**
  - `lint.yml` runs every pre-commit hook except the unit tests;
  - `test.yml` runs the unit tests on Ubuntu 22.04's GJS, and builds and installs the `.deb`.
- **Test what can be tested.** Logic that can live in a pure function belongs in `lib/zoom/viewport.js` (or another `gi`-free module) with unit tests. Every bug fix in pure logic comes with a test that failed before the fix.
- **Manual verification is still required** for anything touching actors, input or teardown. Describe what you checked in the pull request.

## Engineering principles

These are enforced by review, and by lint wherever a tool can measure them. When a lint limit trips, treat it as a design signal: split the code, don't disable the rule.

- **Single responsibility (SRP).** Each file and class has one job you can state in a sentence, ideally its header comment. Lint backs this with size limits: files ≤ 250 lines, functions ≤ 40 lines and ≤ 15 statements, ≤ 4 parameters, nesting ≤ 3, complexity ≤ 8, cognitive complexity ≤ 10, one class per file.
- **Don't repeat yourself (DRY).** One source of truth for every rule, constant and helper. Shared helpers live in `lib/` (e.g. `lib/common/safety.js`), and shared test code in `tests/harness.js`. Enforced by jscpd plus SonarJS (`no-identical-functions`, `no-duplicate-string`, identical branches and conditions).
- **Pure core, thin shell.** Decisions (geometry, state rules) are pure functions or classes with injected dependencies and unit tests. GNOME-facing code only translates between those and actors, signals and settings.
- **Explicit lifetimes.** An object that acquires something in its constructor releases it in `destroy()`. A constructor that fails part way undoes its own work before rethrowing (see `ZoomSession`).
- **Composition root.** `extension.js` creates and connects objects; it doesn't implement features. New behaviour goes in a new or existing `lib/` module.
- **Keep it simple (KISS, YAGNI).** Build what the current step needs. No speculative options, abstractions or settings without a user-facing reason.
- **Name your values.** No magic numbers (lint: `no-magic-numbers`, except -1, 0, 1 and 2); settings keys and other repeated strings go in named constants.

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

- Feedback must be visible on the zoomed screen. Draw indicators inside our own per-monitor view (not zoomed), not only through the shell OSD or the top panel, which may be outside the visible area.
- All shortcuts live in GSettings so users can rebind them. Defaults must not collide with GNOME's accessibility shortcuts (Super+Alt+8, =, −, S).
- Never steal the built-in magnifier's escape hatch: enabling the built-in magnifier (Super+Alt+8) must switch MultiZoom off.

### Style

- ESLint enforces the style: GNOME Shell conventions (4-space indent, single quotes, no spaces inside braces) plus the block layout below. `.editorconfig` covers the rest.
- **Code is split into blocks** separated by blank lines (lint-enforced):
  - a blank line before every comment, except at the start of a block, class, object or array;
  - a blank line before and after every block statement (`if`, loops, `try`, `switch`) and after every multi-line statement;
  - a blank line after declarations, and before `return`;
  - no blank lines at the start or end of a block.
- Group statements that belong together into one block, and put a short comment on top when the block's purpose isn't obvious.
- Comments explain *why*, not *what*. Name units (screen pixels vs view pixels, µs vs ms) in names or comments.

## Releases

- Push a tag `vX.Y.Z` on `main`. `release.yml` tests, builds the `.deb` (version `X.Y.Z`), attaches it and the zip to a GitHub release, and publishes the apt repository to GitHub Pages.
- The repository is signed with the `APT_SIGNING_KEY` secret (an ASCII-armoured private key). Changing the key breaks `apt update` for every user until they fetch the new public key.

## Git workflow

- `main` is protected by CI. Work on a branch; open a pull request; merge only when both workflows pass.
- Small, focused commits with imperative subjects of 72 characters or fewer (e.g. `Lock view per monitor`). Explain *why* in the body when it isn't obvious.
- Don't commit generated files: `schemas/gschemas.compiled`, `dist/`, `node_modules/`.
- When adding a tool, add it to both pre-commit and CI, and pin its version.
