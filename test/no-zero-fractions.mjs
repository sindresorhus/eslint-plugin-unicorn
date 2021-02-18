import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const MESSAGE_ZERO_FRACTION = 'zero-fraction';
const MESSAGE_DANGLING_DOT = 'dangling-dot';
const errorZeroFraction = {
	messageId: MESSAGE_ZERO_FRACTION
};
const errorDanglingDot = {
	messageId: MESSAGE_DANGLING_DOT
};

test({
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
		{
			code: 'const foo = 1.0',
			output: 'const foo = 1',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = 1.0 + 1',
			output: 'const foo = 1 + 1',
			errors: [errorZeroFraction]
		},
		{
			code: 'foo(1.0 + 1)',
			output: 'foo(1 + 1)',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = 1.00',
			output: 'const foo = 1',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = 1.00000',
			output: 'const foo = 1',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = -1.0',
			output: 'const foo = -1',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = 123123123.0',
			output: 'const foo = 123123123',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = 123.11100000000',
			output: 'const foo = 123.111',
			errors: [errorZeroFraction]
		},
		{
			code: 'const foo = 1.',
			output: 'const foo = 1',
			errors: [errorDanglingDot]
		},
		{
			code: 'const foo = +1.',
			output: 'const foo = +1',
			errors: [errorDanglingDot]
		},
		{
			code: 'const foo = -1.',
			output: 'const foo = -1',
			errors: [errorDanglingDot]
		},
		{
			code: 'const foo = 1.e10',
			output: 'const foo = 1e10',
			errors: [errorDanglingDot]
		},
		{
			code: 'const foo = +1.e-10',
			output: 'const foo = +1e-10',
			errors: [errorDanglingDot]
		},
		{
			code: 'const foo = -1.e+10',
			output: 'const foo = -1e+10',
			errors: [errorDanglingDot]
		}
	]
});

test.snapshot([
	'const foo = 1.0',
	'const foo = (1.).toString()'
]);
