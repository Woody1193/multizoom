'use strict';

// Tests for lib/monitorIdentity.js. Run all tests with `make test`.

const {monitorId, idsByIndex, geometryKey} = imports.lib.monitorIdentity;
const {eq} = imports.tests.harness;

// Specs as Mutter reported them on the development machine (2026-11-15).
const DELL = ['DisplayPort-0', 'DEL', 'DELL P3418HW', '4D04D823ACYL'];
const LAPTOP = ['eDP', 'BOE', '0x094a', '0x00000000'];

// monitorId
eq(monitorId(DELL), 'edid:DEL:DELL P3418HW:4D04D823ACYL', 'real serial: vendor, product, serial');
eq(monitorId(['HDMI-1', ...DELL.slice(1)]), monitorId(DELL), 'real serial: same id on another port');
eq(monitorId(LAPTOP), 'edid:BOE:0x094a:eDP', 'zero serial: connector instead');
eq(monitorId(['HDMI-1', 'ABC', 'X', '']), 'edid:ABC:X:HDMI-1', 'empty serial: connector instead');

// idsByIndex
{
    const indexes = {'DisplayPort-0': 0, 'eDP': 1, 'HDMI-1': -1};
    const ids = idsByIndex([DELL, LAPTOP, ['HDMI-1', 'ABC', 'X', 'S1']], c => indexes[c]);

    eq(ids.get(0), monitorId(DELL), 'index 0 is the Dell');
    eq(ids.get(1), monitorId(LAPTOP), 'index 1 is the laptop panel');
    eq(ids.size, 2, 'switched-off monitors are left out');
}

{
    const mirrored = idsByIndex([LAPTOP, DELL], () => 0);

    eq(mirrored.get(0), `${monitorId(LAPTOP)}+${monitorId(DELL)}`, 'mirrored monitors join, sorted');
    eq(idsByIndex([DELL, LAPTOP], () => 0).get(0), mirrored.get(0), 'join is independent of order');
}

// geometryKey
eq(geometryKey({x: 2560, y: 0, width: 1920, height: 1080}), '2560,0,1920x1080', 'geometry key format');
