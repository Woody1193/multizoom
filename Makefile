UUID      := multizoom@woody1193.github.io
EXT_DIR   := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
SCHEMAS   := $(wildcard schemas/*.gschema.xml)

.PHONY: all test lint schemas install uninstall pack clean

all: schemas

## Run the unit tests (pure logic only; runs under plain gjs).
test:
	gjs tests/viewport.test.js

## Run ESLint with zero warnings allowed.
lint:
	npx --no-install eslint --max-warnings=0 .

## Compile GSettings schemas for local development.
schemas: schemas/gschemas.compiled

schemas/gschemas.compiled: $(SCHEMAS)
	glib-compile-schemas --strict schemas/

## Symlink this checkout into the user's extension directory.
install: schemas
	mkdir -p $(dir $(EXT_DIR))
	ln -sfn $(CURDIR) $(EXT_DIR)
	@echo "Installed. Restart GNOME Shell (X11: Alt+F2, r) then: gnome-extensions enable $(UUID)"

uninstall:
	rm -f $(EXT_DIR)

## Build an installable zip in dist/.
pack:
	mkdir -p dist
	gnome-extensions pack --force --extra-source=lib --out-dir=dist .

clean:
	rm -rf dist schemas/gschemas.compiled
