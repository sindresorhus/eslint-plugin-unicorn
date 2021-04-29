import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const foo = "123.1000"',
		'foo("123.1000")',
		'const foo = 1',
		'const foo = 1 + 2',
		'const foo = -1',
		'const foo = 123123123',
		'const foo = 1.1',
		'const foo = -1.1',
		'const foo = 123123123.4',
		'const foo = 1e3'
	],
	invalid: [
		'const foo = 1.0',
		'const foo = 1.0 + 1',
		'foo(1.0 + 1)',
		'const foo = 1.00',
		'const foo = 1.00000',
		'const foo = -1.0',
		'const foo = 123123123.0',
		'const foo = 123.11100000000',
		'const foo = 1.',
		'const foo = +1.',
		'const foo = -1.',
		'const foo = 1.e10',
		'const foo = +1.e-10',
		'const foo = -1.e+10',
		'const foo = (1.).toString()'
	]
});
