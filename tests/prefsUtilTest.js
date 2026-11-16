'use strict';

// Tests for preferences/util.js, with stand-ins for GObjects and GSettings.

const {PERCENT, connectWhileAlive, schemaRange} = imports.preferences.util;
const {eq, ok} = imports.tests.harness;

// A minimal signal emitter: connect, disconnect, emit.
function emitter() {
    const handlers = new Map();
    let nextId = 1;

    return {
        handlers,
        connect: (signal, handler) => {
            handlers.set(nextId, {signal, handler});

            return nextId++;
        },
        disconnect: id => handlers.delete(id),
        emit: signal => [...handlers.values()].filter(h => h.signal === signal).forEach(h => h.handler()),
    };
}

const ZOOM_STEP_CHANGED = 'changed::zoom-step';

eq(PERCENT, 100, 'factor 1 is 100%');

// The handler runs until the widget is destroyed, then is disconnected.
{
    const settings = emitter();
    const widget = emitter();
    let calls = 0;

    connectWhileAlive(settings, ZOOM_STEP_CHANGED, () => calls++, widget);
    settings.emit(ZOOM_STEP_CHANGED);
    eq(calls, 1, 'handler runs while the widget is alive');

    widget.emit('destroy');
    settings.emit(ZOOM_STEP_CHANGED);
    eq(calls, 1, 'handler is gone after the widget is destroyed');
    ok(settings.handlers.size === 0, 'and disconnected from the settings');
}

// The range comes from the schema's <range>: ('range', <(min, max)>).
{
    const settings = {
        settings_schema: {
            get_key: key => ({
                get_range: () => ({
                    deep_unpack: () => ['range', {deep_unpack: () => (key === 'zoom-step' ? [0.05, 4] : [])}],
                }),
            }),
        },
    };

    eq(schemaRange(settings, 'zoom-step').join(), '0.05,4', 'reads [min, max] from the schema');
}
