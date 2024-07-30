import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a < 0 ? -b : b',
		'window.a < 0 ? -window.b : window.b',
	],
	invalid: [
		'a < 0 ? -a : a',
		'a <= 0 ? -a : a',
		'a > 0 ? a : -a',
		'a >= 0 ? a : -a',

		'window.a < 0 ? -window.a : window.a',
		'window.a <= 0 ? -window.a : window.a',
		'window.a > 0 ? window.a : -window.a',
		'window.a >= 0 ? window.a : -window.a',

		'a < 0 ? -a : +a',
		'a < 0 ? -a : +(a)',
	],
});
