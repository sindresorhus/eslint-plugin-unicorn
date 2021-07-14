import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const ERROR_ID_ARRAY_SOME = 'some';
const SUGGESTION_ID_ARRAY_SOME = 'some-suggestion';
const invalidCase = ({code, suggestionOutput}) => ({
	code,
	errors: [
		{
			messageId: ERROR_ID_ARRAY_SOME,
			suggestions: [
				{
					messageId: SUGGESTION_ID_ARRAY_SOME,
					output: suggestionOutput,
				},
			],
		},
	],
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
			'foo.find(...argumentsArray)',
		].map(code => `if (${code}) {}`),
	],
	invalid: [
		...[
			'const bar = !foo.find(fn)',
			'const bar = Boolean(foo.find(fn))',
			'if (foo.find(fn)) {}',
			'const bar = foo.find(fn) ? 1 : 2',
			'while (foo.find(fn)) foo.shift();',
			'do {foo.shift();} while (foo.find(fn));',
			'for (; foo.find(fn); ) foo.shift();',
		].map(code => invalidCase({
			code,
			suggestionOutput: code.replace('find', 'some'),
		})),
		// Comments
		invalidCase({
			code: 'console.log(foo /* comment 1 */ . /* comment 2 */ find /* comment 3 */ (fn) ? a : b)',
			suggestionOutput: 'console.log(foo /* comment 1 */ . /* comment 2 */ some /* comment 3 */ (fn) ? a : b)',
		}),
		// This should not be reported, but `jQuery.find()` is always `truly`,
		// It should not use as a boolean
		invalidCase({
			code: 'if (jQuery.find(".outer > div")) {}',
			suggestionOutput: 'if (jQuery.some(".outer > div")) {}',
		}),
		// Actual messages
		{
			code: 'if (foo.find(fn)) {}',
			errors: [
				{
					message: 'Prefer `.some(…)` over `.find(…)`.',
					suggestions: [
						{
							desc: 'Replace `.find(…)` with `.some(…)`.',
							output: 'if (foo.some(fn)) {}',
						},
					],
				},
			],
		},
	],
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
		`,
	],
});

// - `.filter(…).length > 0`
// - `.filter(…).length !== 0`
test.snapshot({
	valid: [
		// `> 0`
		'array.filter(fn).length > 0.',
		'array.filter(fn).length > .0',
		'array.filter(fn).length > 0.0',
		'array.filter(fn).length > 0x00',
		'array.filter(fn).length < 0',
		'array.filter(fn).length >= 0',
		'0 > array.filter(fn).length',

		// `!== 0`
		'array.filter(fn).length !== 0.',
		'array.filter(fn).length !== .0',
		'array.filter(fn).length !== 0.0',
		'array.filter(fn).length !== 0x00',
		'array.filter(fn).length != 0',
		'array.filter(fn).length === 0',
		'array.filter(fn).length == 0',
		'array.filter(fn).length = 0',
		'0 !== array.filter(fn).length',

		// `>= 1`
		'array.filter(fn).length >= 1',
		'array.filter(fn).length >= 1.',
		'array.filter(fn).length >= 1.0',
		'array.filter(fn).length >= 0x1',
		'array.filter(fn).length > 1',
		'array.filter(fn).length < 1',
		'array.filter(fn).length = 1',
		'array.filter(fn).length += 1',
		'1 >= array.filter(fn).length',

		// `.length`
		'array.filter(fn)?.length > 0',
		'array.filter(fn)[length] > 0',
		'array.filter(fn).notLength > 0',
		'array.filter(fn).length() > 0',
		'+array.filter(fn).length >= 1',

		// `.filter`
		'array.filter?.(fn).length > 0',
		'array?.filter(fn).length > 0',
		'array.notFilter(fn).length > 0',
		'array.filter.length > 0',
	],
	invalid: [
		'array.filter(fn).length > 0',
		'array.filter(fn).length !== 0',
		outdent`
			if (
				((
					((
						((
							((
								array
							))
								.filter(what_ever_here)
						))
							.length
					))
					>
					(( 0 ))
				))
			);
		`,
	],
});

test.vue({
	valid: [],
	invalid: [
		invalidCase({
			code: '<template><div v-if="foo.find(fn)"></div></template>',
			suggestionOutput: '<template><div v-if="foo.some(fn)"></div></template>',
		}),
		invalidCase({
			code: '<script>if (foo.find(fn));</script>',
			suggestionOutput: '<script>if (foo.some(fn));</script>',
		}),
		{
			code: '<template><div v-if="foo.filter(fn).length > 0"></div></template>',
			output: '<template><div v-if="foo.some(fn)"></div></template>',
			errors: 1,
		},
		{
			code: '<template><div v-if="foo.filter(fn).length !== 0"></div></template>',
			output: '<template><div v-if="foo.some(fn)"></div></template>',
			errors: 1,
		},
		{
			code: '<script>if (foo.filter(fn).length > 0);</script>',
			output: '<script>if (foo.some(fn));</script>',
			errors: 1,
		},
	],
});

// Compare with `undefined`
test.snapshot({
	valid: [
		'foo.find(fn) == 0',
		'foo.find(fn) != ""',
		'foo.find(fn) === null',
		'foo.find(fn) !== "null"',
		'foo.find(fn) >= undefined',
		'foo.find(fn) instanceof undefined',
		// We are not checking this right now
		'typeof foo.find(fn) === "undefined"',
	],
	invalid: [
		'foo.find(fn) == null',
		'foo.find(fn) == undefined',
		'foo.find(fn) != null',
		'foo.find(fn) != undefined',
		'foo.find(fn) !== undefined',
		'foo.find(fn) === undefined',
		'a = (( ((foo.find(fn))) == ((null)) )) ? false : true;',
	],
});
