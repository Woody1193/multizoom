'use strict';

// Tests for lib/badgeText.js. Run all tests with `make test`.

const {badgeText} = imports.lib.badgeText;
const {eq} = imports.tests.harness;

eq(badgeText(false, null), '', 'nothing to show hides the badge');
eq(badgeText(true, null), 'Locked', 'locked only');
eq(badgeText(false, 2), '2×', 'whole zoom has no decimals');
eq(badgeText(false, 2.5), '2.5×', 'one decimal');
eq(badgeText(false, 1.953125), '1.95×', 'rounded to two decimals');
eq(badgeText(true, 3.0517578125), 'Locked · 3.05×', 'locked and zoom');
