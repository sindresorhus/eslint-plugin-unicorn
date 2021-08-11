import stripIndent from 'strip-indent';
import {getTester} from './utils/test.mjs';

const fixInput = string_ => fixOutput(stripIndent(string_));
const fixOutput = string_ => string_.split('~').join('`').split('#').join('$');

const {test} = getTester(import.meta);

const errors = [
	{
		messageId: 'template-indent',
	},
];

test({
	valid: [
		'foo = "";',
	],
	/** @type {import('eslint').RuleTester.InvalidTestCase[]} */
	invalid: [
		{

			code: fixInput(`
				foo = dedent~
								one
								two
									three
								~
			`),
			errors,
			output: fixInput(`
				foo = dedent~
				  one
				  two
				  	three
				~
			`),
		},
		{
			options: [{
				tags: ['customIndentableTag'],
			}],
			code: fixInput(`
				foo = customIndentableTag~
								one
								two
									three
								~
				foo = differentTagThatMightBeWhitespaceSensitive~
								one
								two
									three
								~
				foo = ~
								one
								two
									three
								~
			`),
			errors,
			output: fixInput(`
				foo = customIndentableTag~
				  one
				  two
				  	three
				~
				foo = differentTagThatMightBeWhitespaceSensitive~
								one
								two
									three
								~
				foo = ~
								one
								two
									three
								~
			`),
		},
		{
			options: [{
				// Tag: null means fix the indents of raw templates
				// eslint-disable-next-line unicorn/no-null
				tags: ['customIndentableTag', null],
			}],
			code: fixInput(`
				foo = customIndentableTag~
								one
								two
									three
								~
				foo = differentTagThatMightBeWhitespaceSensitive~
								one
								two
									three
								~
				foo = ~
								one
								two
									three
								~
			`),
			errors: [...errors, ...errors],
			output: fixInput(`
				foo = customIndentableTag~
				  one
				  two
				  	three
				~
				foo = differentTagThatMightBeWhitespaceSensitive~
								one
								two
									three
								~
				foo = ~
				  one
				  two
				  	three
				~
			`),
		},
		{
			code: fixInput(`
				function foo() {
					return dedent~
								one
								two
									three
								~
				}
			`),
			errors,
			output: fixInput(`
				function foo() {
					return dedent~
						one
						two
							three
					~
				}
			`),
		},
		{
			code: fixInput(`
				// a
				// bb
				// ccc
				// dddd
				function foo() {
					return dedent~
								one
								two
									three #{3} four
										five
											#{{f: 5}}
										six
								~
				}
			`),
			errors,
			output: fixInput(`
				// a
				// bb
				// ccc
				// dddd
				function foo() {
					return dedent~
						one
						two
							three #{3} four
								five
									#{{f: 5}}
								six
					~
				}
			`),
		},
		{
			code: fixInput(`
				foo = gql~
								one
								two
									three
								~
				foo = sql~
								one
								two
									three
								~
				foo = dedent~
								one
								two
									three
								~
				foo = outdent~
								one
								two
									three
								~
				foo = somethingElse~
								one
								two
									three
								~
			`),
			errors: [...Array.from({length: 4})].flatMap(() => errors),
			output: fixInput(`
				foo = gql~
				  one
				  two
				  	three
				~
				foo = sql~
				  one
				  two
				  	three
				~
				foo = dedent~
				  one
				  two
				  	three
				~
				foo = outdent~
				  one
				  two
				  	three
				~
				foo = somethingElse~
								one
								two
									three
								~
			`),
		},
		{
			code: fixInput(`
				foo = stripIndent(~
								one
								two
									three
								~)
			`),
			errors,
			output: fixInput(`
				foo = stripIndent(~
				  one
				  two
				  	three
				~)
			`),
		},
	],
});
