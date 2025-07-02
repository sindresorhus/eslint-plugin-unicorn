import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'foo.flat()',
		'foo.flat?.(1)',
		'foo?.flat()',
		'foo.flat(1, extra)',
		'flat(1)',
		'new foo.flat(1)',
		'const ONE = 1; foo.flat(ONE)',
		'foo.notFlat(1)',
	],
	invalid: [
		'foo.flat(1)',
		'foo.flat(1.0)',
		'foo.flat(0b01)',
		'foo?.flat(1)',
	],
});
