'use strict';

// Tests for lib/monitors/monitorLabel.js. Run all tests with `make test`.

const {monitorLabel} = imports.lib.monitors.monitorLabel;
const {eq} = imports.tests.harness;

eq(monitorLabel('edid:DEL:DELL P3418HW:4D04D823ACYL').title, 'DELL P3418HW', 'external monitor: its model');
eq(monitorLabel('edid:BOE:0x094a:eDP').title, 'Built-in display', 'laptop panel: built-in display');
eq(monitorLabel('edid:SAM:0x7064:HDMI-1').title, 'SAM display', 'hex-only model: vendor display');
eq(monitorLabel('edid:ABC::SERIAL').title, 'ABC display', 'empty model: vendor display');
eq(monitorLabel('edid:ACM:Model:With:Colons:S1').title, 'Model:With:Colons', 'model may contain colons');

eq(monitorLabel('edid:BOE:0x094a:eDP+edid:DEL:DELL P3418HW:4D04D823ACYL').title,
    'Built-in display + DELL P3418HW', 'mirrored monitors: both names');

{
    const label = monitorLabel('281,0,1920x1080');

    eq(label.title, 'Display at 281, 0', 'geometry key: position');
    eq(label.subtitle, '1920 × 1080, saved by position', 'geometry key: size');
}

eq(monitorLabel('unknown').title, 'unknown', 'anything else is shown as is');
