import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);
const error = {
	messageId: 'no-asterisk-prefix-in-documentation-comments',
};
const asCss = code => ({code, language: languages.css});

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

test.snapshot({
	valid: [
		outdent`
			/*
			Description.
			*/
		`,
		'/* Description. */',
		outdent`
			/*
			* This leading asterisk is content.
			*/
		`,
	].map(code => asCss(code)),
	invalid: [
		outdent`
			/*
			 * Hide "+ 65 releases" link
			 * Hide "Learn more about GitHub Sponsors" link
			 * Hide "+ 123 contributors" link
			 */
		`,
		outdent`
			.example {
				/*
				 * Description.
				 */
				color: red;
			}
		`,
	].map(code => asCss(code)),
});

test.snapshot({
	valid: [
		{
			code: outdent`
				{
					/*
					Description.
					*/
					"value": true
				}
			`,
			language: languages.jsonc,
		},
		{
			code: '{/* Description. */value: true}',
			language: languages.json5,
		},
	],
	invalid: [
		{
			code: outdent`
				{
					/*
					 * JSONC description.
					 */
					"value": true
				}
			`,
			language: languages.jsonc,
		},
		{
			code: outdent`
				{
					/*
					 * JSON5 description.
					 */
					value: true
				}
			`,
			language: languages.json5,
		},
	],
});
