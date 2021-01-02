import {outdent} from 'outdent';
import {test} from './utils/test';

const suggestionCase = ({code, output, desc, options = []}) => {
	const suggestion = {output};
	if (desc) {
		suggestion.desc = desc;
	}

	return {
		code,
		output: code,
		options,
		errors: [
			{suggestions: [suggestion]}
		]
	};
};

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

		// Already in wanted style
		'foo.length === 0',
		'foo.length > 0',

		// Not boolean
		'const bar = foo.length',
		'const bar = +foo.length',
		'const x = Boolean(foo.length, foo.length)',
		'const x = new Boolean(foo.length)',
		'const x = NotBoolean(foo.length)',
		'const length = foo.length ?? 0',
		'if (foo.length ?? bar) {}',

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
		// `WhileStatement`
		outdent`
			while (foo.length > 0) {
				foo.pop();
			}
		`,
		// `DoWhileStatement`
		outdent`
			do {
				foo.pop();
			} while (foo.length > 0);
		`,
		// `ForStatement`
		'for (; foo.length > 0; foo.pop());',

		'if (foo.length !== 1) {}',
		'if (foo.length > 1) {}',
		'if (foo.length < 2) {}'
	],
	invalid: [
		suggestionCase({
			code: 'const x = foo.length || bar()',
			output: 'const x = foo.length > 0 || bar()',
			desc: 'Replace `.length` with `.length > 0`.'
		}),
		suggestionCase({
			code: 'const x = foo.length || bar()',
			output: 'const x = foo.length !== 0 || bar()',
			desc: 'Replace `.length` with `.length !== 0`.',
			options: [{'non-zero': 'not-equal'}]
		}),
		suggestionCase({
			code: 'const x = foo.length || bar()',
			output: 'const x = foo.length >= 1 || bar()',
			desc: 'Replace `.length` with `.length >= 1`.',
			options: [{'non-zero': 'greater-than-or-equal'}]
		}),
		suggestionCase({
			code: '() => foo.length && bar()',
			output: '() => foo.length > 0 && bar()'
		}),
		suggestionCase({
			code: 'alert(foo.length && bar())',
			output: 'alert(foo.length > 0 && bar())'
		})
	]
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
	'if (!(foo.length === 0)) {}',
	'while (foo.length >= 1) {}',
	'do {} while (foo.length);',
	'for (let i = 0; (bar && !foo.length); i ++) {}',
	'const isEmpty = foo.length < 1;',
	'bar(foo.length >= 1)',
	'bar(!foo.length || foo.length)',
	'const bar = void !foo.length;',
	'const isNotEmpty = Boolean(foo.length)',
	'const isNotEmpty = Boolean(foo.length || bar)',
	'const isEmpty = Boolean(!foo.length)',
	'const isEmpty = Boolean(foo.length === 0)',
	'const isNotEmpty = !Boolean(foo.length === 0)',
	'const isEmpty = !Boolean(!Boolean(foo.length === 0))'
]);
