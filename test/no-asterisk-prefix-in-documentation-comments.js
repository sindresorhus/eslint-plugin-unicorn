import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);
const error = {
	messageId: 'no-asterisk-prefix-in-documentation-comments',
};

test.snapshot({
	valid: [
		outdent`
			/**
			Add two numbers.
			@param {number} number1 The first number.
			@param {number} number2 The second number.
			@returns {number} The sum of the two numbers.
			*/
		`,
		'/** Add two numbers. */',
		outdent`
			/*
			 * Regular block comment.
			 */
		`,
		outdent`
			/**
			* This leading asterisk is content.
			*/
		`,
		outdent`
			if (condition) {
				/**
				Description.
				*/
			}
		`,
		'const value = /**\n * Inline documentation comment.\n */ 1;',
	],
	invalid: [
		outdent`
			/**
			 * Add two numbers.
			 * @param {number} number1 The first number.
			 * @param {number} number2 The second number.
			 * @returns {number} The sum of the two numbers.
			 */
		`,
		outdent`
			if (condition) {
				/**
				 * Description.
				 *
				 * @returns {boolean} Whether it passed.
				 */
			}
		`,
		outdent`
			/**
			 *
			 */
		`,
		outdent`
			/**
			 * @param {string} value
			 */
		`,
		outdent`
			/**
			 * *important*
			 */
		`,
		'/**\n\t* Description.\n\t*/',
	],
});

test({
	valid: [],
	invalid: [
		{
			code: '/**\r\n * Description.\r\n */',
			output: '/**\r\nDescription.\r\n*/',
			errors: [error],
		},
		{
			code: outdent`
				/**
				 * First.
				 */

				/**
				 * Second.
				 */
			`,
			output: outdent`
				/**
				First.
				*/

				/**
				Second.
				*/
			`,
			errors: [
				error,
				error,
			],
		},
	],
});
