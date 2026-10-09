import outdent from 'outdent';
import {getTester, languages} from './utils/test.js';

const {test} = getTester(import.meta);
const error = {
	messageId: 'no-asterisk-prefix-in-documentation-comments',
};
const asCss = code => ({code, language: languages.css});
const jsonCrLfInput = '{\r\n\t/*\r\n\t * Description.\r\n\t */\r\n\t"value": true\r\n}';
const jsonCrLfOutput = '{\r\n\t/*\r\n\tDescription.\r\n\t*/\r\n\t"value": true\r\n}';

test({
	testerOptions: {language: languages.soml.language, plugins: languages.soml.plugins},
	valid: [
		'/*\nnote\n*/\n{}',
		'/*\n* This asterisk is content.\n*/\n{}',
		'value: /*\n * Inline comment.\n */ 1',
	],
	invalid: [
		{
			code: '/*\n * Description.\n */\n{}',
			output: '/*\nDescription.\n*/\n{}',
			errors: [error],
		},
		{
			code: 'value: {\n\t/*\n\t Description.\n\t   Indented example.\n\t */\n\tnested: 1\n}',
			output: 'value: {\n\t/*\n\tDescription.\n\t  Indented example.\n\t*/\n\tnested: 1\n}',
			errors: [error],
		},
	],
});

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
			/****
			 * Decorative banner.
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
	valid: [
		'/**\nDescription.\n  Indented example.\n*/',
		'/**\n\n*/',
		'/**\n\t \n*/',
		'/**\n Description.\n\tDifferent indentation.\n*/',
		'if (condition) {\n\t/**\nDescription.\n\t*/\n}',
		'/*\n Description.\n */',
		'/****\n Decorative banner.\n */',
		'const value = /**\n Description.\n */ 1;',
	],
	invalid: [
		{
			code: '/**\n Description.\n   Indented example.\n */',
			output: '/**\nDescription.\n  Indented example.\n*/',
			errors: [error],
		},
		{
			code: '/**\n    Indented example.\n  Description.\n*/',
			output: '/**\n  Indented example.\nDescription.\n*/',
			errors: [error],
		},
		{
			code: '/**\n \tDescription.\n  Indented example.\n*/',
			output: '/**\n\tDescription.\n Indented example.\n*/',
			errors: [error],
		},
		{
			code: '/**\n  - Item.\n    - Nested item.\n  */',
			output: '/**\n- Item.\n  - Nested item.\n*/',
			errors: [error],
		},
		{
			code: '/**\n * Description.\n *   Indented example.\n */',
			output: '/**\nDescription.\n  Indented example.\n*/',
			errors: [error],
		},
		{
			code: '/**\n *   Description.\n *     Indented example.\n */',
			output: '/**\nDescription.\n  Indented example.\n*/',
			errors: [error],
		},
		{
			code: '/**\n\n   Description.\n \n     Indented example.\n \n */',
			output: '/**\n\nDescription.\n\n  Indented example.\n\n*/',
			errors: [error],
		},
		{
			code: '/**\n  Description.\n*/',
			output: '/**\nDescription.\n*/',
			errors: [error],
		},
		{
			code: '/** Description.\n  More details.\n  */',
			output: '/** Description.\nMore details.\n*/',
			errors: [error],
		},
		{
			code: '/**\n  Description. */',
			output: '/**\nDescription. */',
			errors: [error],
		},
		{
			code: '/**\n\t\tDescription.\n\t\t\tIndented example.\n\t*/',
			output: '/**\nDescription.\n\tIndented example.\n*/',
			errors: [error],
		},
		...['\n', '\r\n', '\r', '\u2028', '\u2029'].map(linebreak => ({
			code: `if (condition) {${linebreak}\t/**${linebreak}\t Description.${linebreak}\t   Indented example.${linebreak}\t */${linebreak}}`,
			output: `if (condition) {${linebreak}\t/**${linebreak}\tDescription.${linebreak}\t  Indented example.${linebreak}\t*/${linebreak}}`,
			errors: [error],
		})),
		{
			code: 'if (condition) {\n  /**\n    Description.\n      Indented example.\n    */\n}',
			output: 'if (condition) {\n  /**\n  Description.\n    Indented example.\n  */\n}',
			errors: [error],
		},
		...['\n', '\r\n'].flatMap(linebreak => [
			{
				code: `.example {${linebreak}\t/*${linebreak}\t Description.${linebreak}\t   Indented example.${linebreak}\t */${linebreak}}`,
				output: `.example {${linebreak}\t/*${linebreak}\tDescription.${linebreak}\t  Indented example.${linebreak}\t*/${linebreak}}`,
				language: languages.css.language,
				plugins: languages.css.plugins,
				errors: [error],
			},
			...[languages.jsonc, languages.json5].map(({language, plugins}) => ({
				code: `{${linebreak}\t/*${linebreak}\t Description.${linebreak}\t   Indented example.${linebreak}\t */${linebreak}\t"value": true${linebreak}}`,
				output: `{${linebreak}\t/*${linebreak}\tDescription.${linebreak}\t  Indented example.${linebreak}\t*/${linebreak}\t"value": true${linebreak}}`,
				language,
				plugins,
				errors: [error],
			})),
		]),
	],
});

test({
	valid: [],
	invalid: [
		{
			code: '/**\n Good class\n */',
			output: '/**\nGood class\n*/',
			errors: [error],
		},
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
		{
			code: 'const value = true;\r/**\r * Description.\r */',
			output: 'const value = true;\r/**\rDescription.\r*/',
			errors: [error],
		},
		{
			code: 'const value = true;\u2028/**\u2028 * Description.\u2028 */',
			output: 'const value = true;\u2028/**\u2028Description.\u2028*/',
			errors: [error],
		},
		...[languages.jsonc, languages.json5].map(({language, plugins}) => ({
			code: jsonCrLfInput,
			output: jsonCrLfOutput,
			language,
			plugins,
			errors: [error],
		})),
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
		// CSS treats form feed as a line ending, but supporting it would require language-specific fixer logic.
		'.example {}\f/*\f * Description.\f */',
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

test.snapshot({
	valid: [
		'/**\nnote\n*/\n{}',
		'# * note\n{}',
		'/* ordinary */\n{}',
	].map(testCase => ({language: languages.soml, ...(typeof testCase === 'string' ? {code: testCase} : testCase)})),
	invalid: [
		'/**\n * note\n */\n{}',
		'value: {\n\t/**\n\t * note\n\t */\n\tnested: 1\n}',
	].map(testCase => ({language: languages.soml, ...(typeof testCase === 'string' ? {code: testCase} : testCase)})),
});
