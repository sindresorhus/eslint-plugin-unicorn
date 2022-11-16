import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// No global flag
		'foo.replace(/a/, bar)',
		// Not regex literal
		'foo.replace("string", bar)',
		// Not 2 arguments
		'foo.replace(/a/g)',
		'foo.replace(/\\\\./g)',
		// Not `CallExpression`
		'new foo.replace(/a/g, bar)',
		// Not `MemberExpression`
		'replace(/a/g, bar)',
		// Computed
		'foo[replace](/a/g, bar);',
		// Not replace
		'foo.methodNotReplace(/a/g, bar);',
		// `callee.property` is not a `Identifier`
		'foo[\'replace\'](/a/g, bar)',
		// More or less argument(s)
		'foo.replace(/a/g, bar, extra);',
		'foo.replace();',
		'foo.replace(...argumentsArray, ...argumentsArray2)',
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
		// We are not checking this
		'foo.replaceAll(/a/g, bar)',
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
		// Extra flag
		'foo.replace(/a/gi, bar)',
		'foo.replace(/a/gui, bar)',
		'foo.replace(/a/uig, bar)',
		// Variables
		'const pattern = new RegExp("foo", "g"); foo.replace(pattern, bar)',
		'foo.replace(new RegExp("foo", "g"), bar)',
	],
});
