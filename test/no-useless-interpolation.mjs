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
		'`Hello, ${`Brave New`} World!`', // Should catch also interpolation without expressions inside interpolation
		'`${2021} year!`',
		'`${true} or ${ false } or ${ /* I am comment 🤡 */ null  } or ${\nundefined\n}`', // Whitespaces inside interpolation was added explicitly to test fixer
		'`before ${"head" + someVar + "tail"} after`',
		'`${foo.  toString(\n)}`', // Whitespaces inside interpolation was added explicitly to test fixer
		'`${String(foo)}`',
	],
});
