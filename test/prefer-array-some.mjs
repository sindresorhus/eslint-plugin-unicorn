import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

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
		// Not `boolean`
		'const bar = foo.find(fn)',
		'const bar = foo.find(fn) || baz',
		'if (foo.find(fn) ?? bar) {}',

		// Not matched `CallExpression`
		...[
			// Not `CallExpression`
			'new foo.find(fn)',
			// Not `MemberExpression`
			'find(fn)',
			// `callee.property` is not a `Identifier`
			'foo["find"](fn)',
			'foo["fi" + "nd"](fn)',
			'foo[`find`](fn)',
			// Computed
			'foo[find](fn)',
			// Not `.find`
			'foo.notFind(fn)',
			// More or less argument(s)
			'foo.find()',
			'foo.find(fn, thisArgument, extraArgument)',
			'foo.find(...argumentsArray)'
		].map(code => `if (${code}) {}`)
	],
	invalid: [
		...[
			'const bar = !foo.find(fn)',
			'const bar = Boolean(foo.find(fn))',
			'if (foo.find(fn)) {}',
			'const bar = foo.find(fn) ? 1 : 2',
			'while (foo.find(fn)) foo.shift();',
			'do {foo.shift();} while (foo.find(fn));',
			'for (; foo.find(fn); ) foo.shift();'
		].map(code => invalidCase({
			code,
			suggestionOutput: code.replace('find', 'some')
		})),
		// Comments
		invalidCase({
			code: 'console.log(foo /* comment 1 */ . /* comment 2 */ find /* comment 3 */ (fn) ? a : b)',
			suggestionOutput: 'console.log(foo /* comment 1 */ . /* comment 2 */ some /* comment 3 */ (fn) ? a : b)'
		}),
		// This should not be reported, but `jQuery.find()` is always `truly`,
		// It should not use as a boolean
		invalidCase({
			code: 'if (jQuery.find(".outer > div")) {}',
			suggestionOutput: 'if (jQuery.some(".outer > div")) {}'
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
		}
	]
});

test.snapshot({
	valid: [],
	invalid: [
		'if (array.find(element => element === "🦄")) {}',
		'const foo = array.find(element => element === "🦄") ? bar : baz;',
		outdent`
			if (
				array
					.find(element => Array.isArray(element))
				// ^^^^ This should NOT report
					.find(x => x === 0)
				// ^^^^ This should report
			) {
			}
		`
	]
});
