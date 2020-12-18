import {outdent} from 'outdent';
import {test} from './utils/test';

const nonZeroCases = [
	'foo.length',
	'!!foo.length',
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
	'1 > foo.length'
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

		// Checking 'non-zero'
		'if (foo.length === 0) {}',

		// `ConditionalExpression`
		'const bar = foo.length === 0 ? 1 : 2',

		'if (foo.length !== 1) {}',
		'if (foo.length > 1) {}',
		'if (foo.length < 2) {}'
	],
	invalid: []
});

test.visualize([
	outdent`
		if (
			!!!(
				${zeroCases.filter(code => code !== 'foo.length === 0').join(' &&\n\t\t')}
			) ||
			!(
				${nonZeroCases.filter(code => code !== 'foo.length > 0').join(' ||\n\t\t')}
			)
		) {}
	`,
	{
		code: outdent`
			if (
				${nonZeroCases.filter(code => code !== 'foo.length !== 0').join(' ||\n\t')}
			) {}
		`,
		options: [{'non-zero': 'not-equal'}]
	},
	{
		code: outdent`
			const foo = (
				${nonZeroCases.filter(code => code !== 'foo.length >= 1').join(' &&\n\t')}
			) ? 1 : 2;
		`,
		options: [{'non-zero': 'greater-than-or-equal'}]
	},
	'if (foo.bar && foo.bar.length) {}',
	'if (foo.length || foo.bar()) {}',
	'if (!!(!!foo.length)) {}',
	'if (!(foo.length === 0)) {}'
]);
