import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_LENGTH = 'array-length';
const MESSAGE_ID_ONLY_ELEMENT = 'only-element';
const MESSAGE_ID_SPREAD = 'spread';

const suggestionCase = ({code, suggestions}) => ({
	code,
	errors: [
		{
			messageId: MESSAGE_ID_ERROR,
			suggestions,
		},
	],
});

test({
	valid: [
		'const array = Array.from({length: 1})',

		// ESLint builtin rule `no-array-constructor` cases
		'const array = new Array()',
		'const array = new Array',
		'const array = new Array(1, 2)',
		'const array = Array(1, 2)',

		// `unicorn/new-for-builtins` cases
		'const array = Array(1)',
	],
	invalid: [
		suggestionCase({
			code: 'const array = new Array(foo)',
			suggestions: [
				{
					messageId: MESSAGE_ID_LENGTH,
					output: 'const array = Array.from({length: foo})',
				},
				{
					messageId: MESSAGE_ID_ONLY_ELEMENT,
					output: 'const array = [foo]',
				},
			],
		}),
		suggestionCase({
			code: 'const array = new Array(length)',
			suggestions: [
				{
					messageId: MESSAGE_ID_LENGTH,
					output: 'const array = Array.from({length})',
				},
				{
					messageId: MESSAGE_ID_ONLY_ELEMENT,
					output: 'const array = [length]',
				},
			],
		}),
		suggestionCase({
			code: outdent`
				const foo = []
				new Array(bar).forEach(baz)
			`,
			suggestions: [
				{
					messageId: MESSAGE_ID_LENGTH,
					output: outdent`
						const foo = []
						Array.from({length: bar}).forEach(baz)
					`,
				},
				{
					messageId: MESSAGE_ID_ONLY_ELEMENT,
					output: outdent`
						const foo = []
						;[bar].forEach(baz)
					`,
				},
			],
		}),
		...[
			'...[foo]',
			'...foo',
			'...[...foo]',
			// The following cases we can know the result, but we are not auto-fixing them
			'...[1]',
			'...["1"]',
			'...[1, "1"]',
		].map(argumentText => {
			const code = `const array = new Array(${argumentText})`;
			return {
				code,
				errors: [
					{
						messageId: MESSAGE_ID_ERROR,
						suggestions: [
							{
								messageId: MESSAGE_ID_SPREAD,
								output: `const array = [${argumentText}]`,
							},
						],
					},
				],
			};
		}),
		suggestionCase({
			code: outdent`
				const foo = []
				new Array(...bar).forEach(baz)
			`,
			suggestions: [
				{
					messageId: MESSAGE_ID_SPREAD,
					output: outdent`
						const foo = []
						;[...bar].forEach(baz)
					`,
				},
			],
		}),
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'const array = new Array(1)',
		// This is actually `[]`, but we fix to `Array.from({length: zero})`
		outdent`
			const zero = 0;
			const array = new Array(zero);
		`,
		// Use shorthand
		outdent`
			const length = 1;
			const array = new Array(length);
		`,
		'const array = new Array(1.5)',
		'const array = new Array(Number("1"))',
		'const array = new Array("1")',
		'const array = new Array(null)',
		'const array = new Array(("1"))',
		'const array = new Array((0, 1))',
		outdent`
			const foo = []
			new Array("bar").forEach(baz)
		`,
		// Number
		'new Array(0xff)',
		'new Array(Math.PI | foo)',
		'new Array(Math.min(foo, bar))',
		'new Array(Number(foo))',
		'new Array(Number.MAX_SAFE_INTEGER)',
		'new Array(parseInt(foo))',
		'new Array(Number.parseInt(foo))',
		'new Array(+foo)',
		'new Array(-foo)',
		'new Array(~foo)',
		'new Array(foo.length)',
		'const foo = 1; new Array(foo + 2)',
		'new Array(foo - 2)',
		'new Array(foo -= 2)',
		'new Array(foo ? 1 : 2)',
		'new Array((1n, 2))',
		'new Array(Number.NaN)',
		'new Array(NaN)',
		// Not number
		'new Array("0xff")',
		'new Array(Math.NON_EXISTS_PROPERTY)',
		'new Array(Math.NON_EXISTS_METHOD(foo))',
		'new Array(Math[min](foo, bar))',
		'new Array(Number[MAX_SAFE_INTEGER])',
		'new Array(new Number(foo))',
		'const foo = 1; new Array(foo + "2")',
		'new Array(foo - 2n)',
		'new Array(foo -= 2n)',
		'new Array(foo instanceof 1)',
		'new Array(foo || 1)',
		'new Array(foo ||= 1)',
		'new Array(foo ? 1n : 2)',
		'new Array((1, 2n))',
	],
});
