UUID      := multizoom@woody1193.github.io
EXT_DIR   := $(HOME)/.local/share/gnome-shell/extensions/$(UUID)
SCHEMAS   := $(wildcard schemas/*.gschema.xml)
ZIP       := dist/$(UUID).shell-extension.zip

# Debian package. CI sets VERSION from the release tag (v1.2.3 -> 1.2.3).
PACKAGE   := gnome-shell-extension-multizoom
VERSION   ?= 0.0.0~dev
DEB_ROOT  := dist/deb
DEB       := dist/$(PACKAGE)_$(VERSION)_all.deb

.PHONY: all test lint schemas install uninstall pack deb clean

all: schemas

## Run the unit tests (pure logic only; runs under plain gjs).
test:
	gjs tests/run.js

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
	gnome-extensions pack --force --extra-source=lib --extra-source=preferences --out-dir=dist .

## Build a Debian package in dist/ from the same files as the zip.
deb: pack
	rm -rf $(DEB_ROOT)
	mkdir -p $(DEB_ROOT)/DEBIAN $(DEB_ROOT)/usr/share/doc/$(PACKAGE) $(DEB_ROOT)/usr/share/gnome-shell/extensions/$(UUID)
	unzip -q $(ZIP) -d $(DEB_ROOT)/usr/share/gnome-shell/extensions/$(UUID)
	cp LICENSE $(DEB_ROOT)/usr/share/doc/$(PACKAGE)/copyright
	sed 's/@VERSION@/$(VERSION)/' packaging/control.in > $(DEB_ROOT)/DEBIAN/control
	chmod -R u=rwX,go=rX $(DEB_ROOT)
	dpkg-deb --root-owner-group --build $(DEB_ROOT) $(DEB)

clean:
	rm -rf dist schemas/gschemas.compiled
