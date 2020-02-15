import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
const rule = require('../rules/prefer-replace-all');

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	ruleId: 'prefer-replace-all',
	message: 'Prefer `String#replaceAll()` over `String#replace()`.'
};

ruleTester.run('prefer-replace-all', rule, {
	valid: [
		// No global flag
		'foo.replace(/a/, bar)',
		// Special characters
		'foo.replace(/[a]/g, bar)',
		'foo.replace(/a?/g, bar)',
		'foo.replace(/.*/g, bar)',
		'foo.replace(/\\W/g, bar)',
		// Extra flag
		'foo.replace(/a/gi, bar)',
		// Not regex literal
		'foo.replace(\'string\', bar)',
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
		'foo.replace(...argumentsArray, ...argumentsArray2)'
	],
	invalid: [
		{
			code: 'foo.replace(/a/g, bar)',
			output: 'foo.replaceAll(\'a\', bar)',
			errors: [error]
		},
		// Comments
		{
			code: `
				foo/* comment 1 */
					.replace/* comment 2 */(
						/* comment 3 */
						/a/g // comment 4
						,
						bar
					)
			`,
			output: `
				foo/* comment 1 */
					.replaceAll/* comment 2 */(
						/* comment 3 */
						'a' // comment 4
						,
						bar
					)
			`,
			errors: [error]
		},
		// Quotes
		{
			code: 'foo.replace(/"\'/g, \'\\\'\')',
			output: 'foo.replaceAll(\'"\\\'\', \'\\\'\')',
			errors: [error]
		},
		// Escaped symbols
		{
			code: 'foo.replace(/\\./g, bar)',
			output: 'foo.replaceAll(\'.\', bar)',
			errors: [error]
		},
		{
			code: 'foo.replace(/\\\\\\./g, bar)',
			output: 'foo.replaceAll(\'\\.\', bar)',
			errors: [error]
		}
	]
});
