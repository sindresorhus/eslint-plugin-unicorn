import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'array.flat(1)',
		'array.flat(1.0)',
		'array.flat(0x01)',
		'array.flat(unknown)',
		'array.flat(Number.POSITIVE_INFINITY)',
		'array.flat(Infinity)',
		'array.flat(/* explanation */2)',
		'array.flat(2/* explanation */)',
		'array.flat()',
		'array.flat(2, extraArgument)',
		'new array.flat(2)',
		'array.flat?.(2)',
		'array.notFlat(2)',
		'flat(2)',
	],
	invalid: [
		'array.flat(2)',
		'array?.flat(2)',
		'array.flat(99,)',
		'array.flat(0b10,)',
	],
});
