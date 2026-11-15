'use strict';

// Tests for lib/badgeText.js. Run all tests with `make test`.

const {badgeText} = imports.lib.badgeText;
const {eq} = imports.tests.harness;

eq(badgeText(false, null), '', 'nothing to show hides the badge');
eq(badgeText(true, null), 'Locked', 'locked only');
eq(badgeText(false, 2), 'Zoom 200%', 'zoom as a percentage');
eq(badgeText(false, 1.5625), 'Zoom 156%', 'rounded down to a whole percent');
eq(badgeText(false, 1.953125), 'Zoom 195%', 'rounded to the nearest percent');
eq(badgeText(false, 2.44140625), 'Zoom 244%', 'two zoom-in steps from 1.5625');
eq(badgeText(true, 3.0517578125), 'Locked · Zoom 305%', 'locked and zoom');
