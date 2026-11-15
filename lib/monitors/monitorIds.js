'use strict';
/* exported MonitorIds */

const {Gio, Meta} = imports.gi;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const {idsByIndex, geometryKey} = Me.imports.lib.monitors.monitorIdentity;
const {guard} = Me.imports.lib.common.safety;

const DISPLAY_CONFIG = 'org.gnome.Mutter.DisplayConfig';
const DISPLAY_CONFIG_PATH = '/org/gnome/Mutter/DisplayConfig';
const GET_CURRENT_STATE = 'GetCurrentState';
const NO_TIMEOUT = -1;

// Knows which physical monitor (by EDID, see lib/monitors/monitorIdentity.js) is at
// each place on screen, and asks Mutter again whenever monitors change.
//
// Mutter's D-Bus service runs inside gnome-shell itself, so the call must
// be asynchronous: a blocking call would wait on its own main loop forever.
// At shell startup, extensions are enabled before the service is on the bus
// (the call fails with ServiceUnknown), so the first query waits for its
// name to appear. Until the first answer, and briefly after each change,
// idOf() returns null and callers fall back to geometry.
var MonitorIds = class MonitorIds {
    // onChanged(): called when the ids for the current layout are known or
    // have changed. onError(e): called if handling the answer fails.
    constructor(onChanged, onError) {
        this._onChanged = onChanged;
        this._byGeometry = new Map();
        this._cancellable = new Gio.Cancellable();
        this._onReply = guard((bus, result) => this._handleReply(bus, result), onError);

        const query = guard(() => this._query(), onError);

        Meta.MonitorManager.get().connectObject('monitors-changed', query, this);

        // Calls `query` straight away if the service is already there.
        this._watchId = Gio.bus_watch_name(Gio.BusType.SESSION, DISPLAY_CONFIG,
            Gio.BusNameWatcherFlags.NONE, query, null);
    }

    // Id of the monitor at `monitor`'s geometry, or null if not known yet.
    idOf(monitor) {
        return this._byGeometry.get(geometryKey(monitor)) ?? null;
    }

    destroy() {
        Gio.bus_unwatch_name(this._watchId);
        this._cancellable.cancel();
        Meta.MonitorManager.get().disconnectObject(this);
        this._onChanged = null;
    }

    _query() {
        Gio.DBus.session.call(DISPLAY_CONFIG, DISPLAY_CONFIG_PATH, DISPLAY_CONFIG, GET_CURRENT_STATE,
            null, null, Gio.DBusCallFlags.NONE, NO_TIMEOUT, this._cancellable, this._onReply);
    }

    _handleReply(bus, result) {
        const specs = this._readSpecs(bus, result);

        if (!specs)
            return;

        const manager = Meta.MonitorManager.get();
        const ids = idsByIndex(specs, connector => manager.get_monitor_for_connector(connector));
        const byGeometry = new Map(Main.layoutManager.monitors.map((m, i) => [geometryKey(m), ids.get(i) ?? null]));

        if (sameEntries(byGeometry, this._byGeometry))
            return;

        this._byGeometry = byGeometry;
        this._onChanged();
    }

    // Mutter's [connector, vendor, product, serial] per monitor, or null if
    // the call failed or was cancelled (destroy()). Without ids, monitors are
    // keyed by geometry, so a failure here isn't fatal.
    _readSpecs(bus, result) {
        try {
            const [, monitors] = bus.call_finish(result).deep_unpack();

            return monitors.map(([spec]) => spec);
        } catch (e) {
            if (!e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                log(`[multizoom] couldn't read monitor ids: ${e.message}`);

            return null;
        }
    }
};

function sameEntries(a, b) {
    return a.size === b.size && [...a].every(([key, value]) => b.get(key) === value);
}
