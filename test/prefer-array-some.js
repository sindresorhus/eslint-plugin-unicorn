import {outdent} from 'outdent';
import {flatten} from 'lodash';
import {test} from './utils/test';

const MESSAGE_ID_ERROR = 'error';
const MESSAGE_ID_SUGGESTION = 'suggestion';

const invalidCase = ({code, suggestionOutput}) => ({
	code,
	output: code,
	errors: [
		{
			messageId: MESSAGE_ID_ERROR,
			suggestions: [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					output: suggestionOutput
				}
			]
		}
	]
});

test({
	valid: [
		'if (foo.some(fn)) {}',
		'if (foo.every(fn)) {}',

		// Not `IfStatement`/`ConditionalExpression` `.test`
		'true ? foo.find(fn) : foo.find(fn)',
		'if (true) foo.find(fn); else foo.find(fn);',
		'if (true) { foo.find(fn); } else { foo.find(fn); }',

		// Not matched `CallExpression`
		...flatten(
			[
				// Not `CallExpression`
				'new foo.find(fn)',
				// Not `MemberExpression`
				'find(fn)',
				// `callee.property` is not a `Identifier`
				'foo["find"](fn)',
				'foo["fi" + "nd"](fn)',
				'foo[`find`](fn)',
				// Computed
				'foo[map](fn)',
				// Not `.find`
				'foo.notFind(fn)',
				// More or less argument(s)
				'foo.find()',
				'foo.find(fn, thisArgument, extraArgument)',
				'foo.find(...argumentsArray)'
			].map(code => [
				`${code} ? 1 : 2`,
				`if (${code}) {}`,
			])
		)
	],
	invalid: [
		invalidCase({
			code: 'if (foo.find(fn)) {}',
			suggestionOutput: 'if (foo.some(fn)) {}'
		}),
		invalidCase({
			code: 'if (foo.find(fn, thisArgument)) {}',
			suggestionOutput: 'if (foo.some(fn, thisArgument)) {}'
		}),
		invalidCase({
			code: 'if (foo().bar.find(fn)) {}',
			suggestionOutput: 'if (foo().bar.some(fn)) {}'
		}),
		invalidCase({
			code: 'console.log(foo.find(fn) ? a : b)',
			suggestionOutput: 'console.log(foo.some(fn) ? a : b)'
		}),
		// Comments
		invalidCase({
			code: 'console.log(foo /* comment 1 */ . /* comment 2 */ find /* comment 3 */ (fn) ? a : b)',
			suggestionOutput: 'console.log(foo /* comment 1 */ . /* comment 2 */ some /* comment 3 */ (fn) ? a : b)'
		}),
		// This should not be reported, but `jQuery.find()` is always `truly`,
		// Nobody use it in `IfStatement.test`
		invalidCase({
			code: 'if(jQuery.find(".outer > div")) {}',
			suggestionOutput: `if(jQuery.some(".outer > div")) {}`
		}),
		// Actual messages
		{
			code: 'if (foo.find(fn)) {}',
			output: 'if (foo.find(fn)) {}',
			errors: [
				{
					message: 'Prefer `.some(…)` over `.find(…)`.',
					suggestions: [
						{
							desc: 'Replace `.find(…)` with `.some(…)`.',
							output: 'if (foo.some(fn)) {}'
						}
					]
				}
			]
		},
	]
});

test.visualize([
	'if (array.find(element => element === "🦄")) {}',
	'const foo = array.find(element => element === "🦄") ? bar : baz;',
	outdent`
		if (
			array
				/* correct */.find(element => Array.isArray(element))
				/* incorrect */.find(element => element/* incorrect */.find(fn) ? 1 : 0)
		) {
			console.log(jQuery/* correct */.find('div'));
		} else {
			console.log(array/* incorrect */.find(fn) ? 'yes' : 'no');
		}
	`
]);
