import {outdent} from 'outdent';
import {test} from './utils/test';

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_LENGTH = 'array-length';
const MESSAGE_ID_FIRST_ELEMENT = 'first-element';
const MESSAGE_ID_SPREAD = 'spread';

const suggestionCase = ({code, suggestions}) => ({
	code,
	output: code,
	errors: [
		{
			messageId: MESSAGE_ID_ERROR,
			suggestions
		}
	]
});

test({
	valid: [
		'const array = Array.from({length: 1})',

		// ESLint builtin rule `no-array-constructor` cases
		'const array = new Array(1, 2)',
		'const array = Array(1, 2)',

		// `unicorn/new-for-builtins` cases
		'const array = Array(1)'
	],
	invalid: [
		suggestionCase({
			code: 'const array = new Array(foo)',
			suggestions: [
				{
					messageId: MESSAGE_ID_LENGTH,
					output: 'const array = Array.from({length: foo})'
				},
				{
					messageId: MESSAGE_ID_FIRST_ELEMENT,
					output: 'const array = [foo]'
				}
			]
		}),
		...[
			'...[foo]',
			'...foo',
			'...[...foo]',
			// The following cases we can know the result, but we are not auto-fixing them
			'...[1]',
			'...["1"]',
			'...[1, "1"]'
		].map(argumentText => {
			const code = `const array = new Array(${argumentText})`;
			return {
				code,
				output: code,
				errors: [
					{
						messageId: MESSAGE_ID_ERROR,
						suggestions: [
							{
								messageId: MESSAGE_ID_SPREAD,
								output: `const array = [${argumentText}]`
							}
						]
					}
				]
			};
		})
	]
});

test.visualize([
	'const array = new Array()',
	'const array = new Array',
	'const array = new Array(1)',
	// This is actually `[]`, but we fix to `Array.from({length: zero})`
	outdent`
		const zero = 0;
		const array = new Array(zero);
	`,
	'const array = new Array(1.5)',
	'const array = new Array(Number("1"))',
	'const array = new Array("1")',
	'const array = new Array(null)',
	'const array = new Array(("1"))',
	'const array = new Array((0, 1))'
]);
