import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// No global flag
		'foo.replace(/a/, bar)',
		'foo.replaceAll(/a/, bar)',
		// Not regex literal
		'foo.replace("string", bar)',
		'foo.replaceAll("string", bar)',
		// Not 2 arguments
		'foo.replace(/a/g)',
		'foo.replaceAll(/a/g)',
		'foo.replace(/\\\\./g)',
		'foo.replaceAll(/\\\\./g)',
		// Not `CallExpression`
		'new foo.replace(/a/g, bar)',
		'new foo.replaceAll(/a/g, bar)',
		// Not `MemberExpression`
		'replace(/a/g, bar)',
		'replaceAll(/a/g, bar)',
		// Computed
		'foo[replace](/a/g, bar);',
		'foo[replaceAll](/a/g, bar);',
		// Not replace
		'foo.methodNotReplace(/a/g, bar);',
		// `callee.property` is not a `Identifier`
		'foo[\'replace\'](/a/g, bar)',
		'foo[\'replaceAll\'](/a/g, bar)',
		// More or less argument(s)
		'foo.replace(/a/g, bar, extra);',
		'foo.replaceAll(/a/g, bar, extra);',
		'foo.replace();',
		'foo.replaceAll();',
		'foo.replace(...argumentsArray, ...argumentsArray2)',
		'foo.replaceAll(...argumentsArray, ...argumentsArray2)',
		// Unknown/non-regexp/non-global value
		'foo.replace(unknown, bar)',
		'const pattern = new RegExp("foo", unknown); foo.replace(pattern, bar)',
		'const pattern = new RegExp("foo"); foo.replace(pattern, bar)',
		'const pattern = new RegExp(); foo.replace(pattern, bar)',
		'const pattern = "string"; foo.replace(pattern, bar)',
		'const pattern = new RegExp("foo", "g"); foo.replace(...[pattern], bar)',
		'const pattern = "not-a-regexp"; foo.replace(pattern, bar)',
		'const pattern = new RegExp("foo", "i"); foo.replace(pattern, bar)',
		'foo.replace(new NotRegExp("foo", "g"), bar)',
	],
	invalid: [
		'foo.replace(/a/g, bar)',
		// Comments
		outdent`
			foo/* comment 1 */
				.replace/* comment 2 */(
					/* comment 3 */
					/a/g // comment 4
					,
					bar
				)
		`,
		// Quotes
		'foo.replace(/"\'/g, \'\\\'\')',
		// Escaped symbols
		'foo.replace(/\\./g, bar)',
		'foo.replace(/\\\\\\./g, bar)',
		'foo.replace(/\\|/g, bar)',
		// `u` flag
		'foo.replace(/a/gu, bar)',
		'foo.replace(/a/ug, bar)',
		// Special characters
		'foo.replace(/[a]/g, bar)',
		'foo.replace(/a?/g, bar)',
		'foo.replace(/.*/g, bar)',
		'foo.replace(/a|b/g, bar)',
		'foo.replace(/\\W/g, bar)',
		'foo.replace(/\\u{61}/g, bar)',
		'foo.replace(/\\u{61}/gu, bar)',
		'foo.replace(/]/g, "bar")',
		// Extra flag
		'foo.replace(/a/gi, bar)',
		'foo.replace(/a/gui, bar)',
		'foo.replace(/a/uig, bar)',
		// Variables
		'const pattern = new RegExp("foo", "g"); foo.replace(pattern, bar)',
		'foo.replace(new RegExp("foo", "g"), bar)',

		'foo.replace(/a]/g, _)',
		'foo.replace(/[a]/g, _)',
		'foo.replace(/a{1/g, _)',
		'foo.replace(/a{1}/g, _)',
		'foo.replace(/\\u0022/g, _)',
		'foo.replace(/\\u0027/g, _)',
		'foo.replace(/\\cM\\cj/g, _)',
		'foo.replace(/\\x22/g, _)',
		'foo.replace(/\\x27/g, _)',
		'foo.replace(/\\uD83D\\ude00/g, _)',
		'foo.replace(/\\u{1f600}/gu, _)',
		'foo.replace(/\\n/g, _)',
		'foo.replace(/\\u{20}/gu, _)',

		'foo.replaceAll(/a]/g, _)',
		'foo.replaceAll(/\\r\\n\\u{1f600}/gu, _)',
		`foo.replaceAll(/a${' very'.repeat(30)} string/g, _)`,
	],
});
