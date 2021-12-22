/* eslint-disable no-template-curly-in-string */
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'"foo"',
		'`foobar`',
		'`foobar ${someVar}`',
		'`${void 0}`',
	],
	invalid: [
		'`${"foo"}`',
		'`${"foo"}${"bar"}`',
		'`Hello, ${`Brave ${"New"}`} ${"World"}!`',
		'`${2021} year!`',
		'`${true} or ${false} or ${null} or ${undefined}`',
		'`before ${"head" + someVar + "tail"} after`',
		'`${foo.toString()}`',
		'`${String(foo)}`',
	],
});
