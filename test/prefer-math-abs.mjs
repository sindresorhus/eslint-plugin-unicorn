import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'a < 0 ? -b : b',
		'window.a < 0 ? -window.b : window.b',

		'a < 0 ? a : a',
		'a > 0 ? a : a',
		'a > 0 ? a * -1 : a',
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

		'a < 0 ? a * -1 : a',
		'a < 0 ? -1 * a : a',
		'a > 0 ? a : a * -1',
		'a > 0 ? a : -1 * a',

		'if (foo > POSITIVE_CONSTANT || foo < -POSITIVE_CONSTANT) {}',
		'if (foo < -POSITIVE_CONSTANT || foo > POSITIVE_CONSTANT) {}',
	],
});
