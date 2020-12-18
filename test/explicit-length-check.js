import {test} from './utils/test';

const nonZeroCases = [
	'foo.length',
	'foo.length !== 0',
	'foo.length != 0',
	'foo.length > 0',
	'foo.length >= 1',
	'0 !== foo.length',
	'0 != foo.length',
	'0 < foo.length',
	'1 <= foo.length'
];

const zeroCases = [
	'!foo.length',
	'foo.length === 0',
	'foo.length == 0',
	'foo.length < 1',
	'0 === foo.length',
	'0 == foo.length',
	'1 > foo.length',
];

test({
	valid: [
		// Not `.length`
		'if (foo.notLength) {}',
		'if (length) {}',
		'if (foo[length]) {}',
		'if (foo["length"]) {}',

		// Not in `IfStatement` or `ConditionalExpression`
		'foo.length',
		'foo.length === 0',
		'foo.length !== 0',
		'foo.length > 0',

		// Checking 'non-zero'
		'if (foo.length > 0) {}',
		{
			code: 'if (foo.length > 0) {}',
			options: [{'non-zero': 'greater-than'}]
		},
		{
			code: 'if (foo.length !== 0) {}',
			options: [{'non-zero': 'not-equal'}]
		},
		{
			code: 'if (foo.length >= 1) {}',
			options: [{'non-zero': 'greater-than-or-equal'}]
		},

		// Checking non-'non-zero'
		'if (foo.length === 0) {}',

		// `ConditionalExpression`
		'const bar = foo.length === 0 ? 1 : 2'
	],
	invalid: []
});

test.visualize([
	...[
		...nonZeroCases.filter(code => code !== 'foo.length > 0'),
		...zeroCases.filter(code => code !== 'foo.length === 0')
	].map(code => `if (${code}) {}`),
	...[
		...nonZeroCases.filter(code => code !== 'foo.length > 0'),
		...zeroCases.filter(code => code !== 'foo.length === 0')
	].map(code => `${code} ? 1 : 2`),
]);
