import stripIndent from 'strip-indent';
import {getTester} from './utils/test.mjs';

/**
 * The interesting things to test for this rule are whitespace and multiline templates. Both of those are _very_ hard to see in a
 * normal text editor, so replace spaces with •, tabs with →→, backticks with @, and $ (template parameter prefix symbol) with #.
 *
 * @param {string} text
 */
const fixInput = text => stripIndent(text).split('@').join('`').split('#').join('$').split('•').join(' ').split('→→').join('\t');

const {test} = getTester(import.meta);

const errors = [
	{
		messageId: 'template-indent',
	},
];

test({
	/** @type {import('eslint').RuleTester.InvalidTestCase[]} */
	invalid: [
		{
			code: fixInput(`
				foo = dedent@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
			`),
			errors,
			output: fixInput(`
				foo = dedent@
				••one
				••two
				••••three
				@
			`),
		},
		{
			options: [{
				tags: ['customIndentableTag'],
			}],
			code: fixInput(`
				foo = customIndentableTag@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
				foo = differentTagThatMightBeWhitespaceSensitive@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
				foo = @
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
			`),
			errors,
			output: fixInput(`
				foo = customIndentableTag@
				••one
				••two
				••••three
				@
				foo = differentTagThatMightBeWhitespaceSensitive@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
				foo = @
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
			`),
		},
		{
			options: [{
				tags: ['customIndentableTag'],
				selectors: [':not(TaggedTemplateExpression) > TemplateLiteral'],
			}],
			code: fixInput(`
				foo = customIndentableTag@
				••••••••one1
				••••••••two1
				••••••••••three1
				••••••••@
				foo = differentTagThatMightBeWhitespaceSensitive@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
				foo = @
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
			`),
			errors: [...errors, ...errors],
			output: fixInput(`
				foo = customIndentableTag@
				••one1
				••two1
				••••three1
				@
				foo = differentTagThatMightBeWhitespaceSensitive@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
				foo = @
				••one
				••two
				••••three
				@
			`),
		},
		{
			code: fixInput(`
				function foo() {
				••return dedent@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
				}
			`),
			errors,
			output: fixInput(`
				function foo() {
				••return dedent@
				••••one
				••••two
				••••••three
				••@
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
				••return dedent@
				••••••••one
				••••••••two
				••••••••••three #{3} four
				••••••••••••five
				••••••••••••••#{{f: 5}}
				••••••••••••six
				••••••••@
				}
			`),
			errors,
			output: fixInput(`
				// a
				// bb
				// ccc
				// dddd
				function foo() {
				••return dedent@
				••••one
				••••two
				••••••three #{3} four
				••••••••five
				••••••••••#{{f: 5}}
				••••••••six
				••@
				}
			`),
		},
		{
			code: fixInput(`
				foo = gql@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
				foo = sql@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
				foo = dedent@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
				foo = outdent@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
				foo = somethingElse@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
			`),
			errors: [...Array.from({length: 4})].flatMap(() => errors),
			output: fixInput(`
				foo = gql@
				••one
				••two
				••••three
				@
				foo = sql@
				••one
				••two
				••••three
				@
				foo = dedent@
				••one
				••two
				••••three
				@
				foo = outdent@
				••one
				••two
				••••three
				@
				foo = somethingElse@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
			`),
		},
		{
			code: fixInput(`
				foo = stripIndent(@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@)
			`),
			errors,
			output: fixInput(`
				foo = stripIndent(@
				••one
				••two
				••••three
				@)
			`),
		},
		{
			code: fixInput(`
				html = /* HTML */ @
				••••••••<div>
				••••••••••<span>hello</span>
				••••••••</div>
				••••••••@
			`),
			errors,
			output: fixInput(`
				html = /* HTML */ @
				••<div>
				••••<span>hello</span>
				••</div>
				@
			`),
		},
		{
			code: fixInput(`
				html = /* html */ @
				••••••••<div>
				••••••••••<span>hello</span>
				••••••••</div>
				••••••••@
			`),
			errors,
			output: fixInput(`
				html = /* html */ @
				••<div>
				••••<span>hello</span>
				••</div>
				@
			`),
		},
		{
			code: fixInput(`
				html = /* indent */ @
				••••••••<div>
				••••••••••<span>hello</span>
				••••••••</div>
				••••••••@
			`),
			errors,
			output: fixInput(`
				html = /* indent */ @
				••<div>
				••••<span>hello</span>
				••</div>
				@
			`),
		},
		{
			options: [{
				comments: ['please indent me!'],
			}],
			code: fixInput(`
				html = /* please indent me! */ @
				••••••••<div>
				••••••••••<span>hello</span>
				••••••••</div>
				••••••••@
			`),
			errors,
			output: fixInput(`
				html = /* please indent me! */ @
				••<div>
				••••<span>hello</span>
				••</div>
				@
			`),
		},
	],
	/** @type {import('eslint').RuleTester.ValidTestCase[]} */
	valid: [
		'foo = dedent`one two three`',
		fixInput(`
			function f() {
			→→foo = dedent@
			→→→→one
			→→→→two
			→→→→→→three
			→→→→four
			→→@
			}
		`),
		fixInput(`
			function f() {
			→→foo = dedent@
			→→→→one

			→→→→two
			→→→→→→three
			→→→→four
			→→@
			}
		`),
		fixInput(`
			function f() {
			••foo = dedent@
			••••one
			••••two
			••••••three
			••••four
			••@
			}
		`),
		{
			options: [{
				tags: ['somethingOtherThanDedent'],
				functions: ['somethingOtherThanStripIndent'],
			}],
			code: fixInput(`
				foo = stripIndent(@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@)
				foo = dedent@
				••••••••one
				••••••••two
				••••••••••three
				••••••••@
			`),
		},
		'stripIndent(foo)',
		{
			options: [{
				selectors: ['TemplateElement'],
			}],
			// Bad selector; no template literal match
			code: fixInput(`
				foo = @
				••••••one
				••••••two
				••••••••three
				@
			`),
		},
	],
});
