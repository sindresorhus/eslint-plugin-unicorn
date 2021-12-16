import stripIndent from 'strip-indent';
import {getTester} from './utils/test.mjs';

/**
 * The interesting things to test for this rule are whitespace and multiline templates. Both of those are _very_ hard to see in a
 * normal text editor, so replace spaces with •, and tabs with →→.
 *
 * @param {string} text
 */
const fixInput = text => stripIndent(text)
	.replace(/•/g, ' ')
	.replace(/→→/g, '\t');

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
				foo = dedent\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
			`),
			errors,
			output: fixInput(`
				foo = dedent\`
				••one
				••two
				••••three
				\`
			`),
		},
		{
			code: ['dedent`', 'one', 'two', '`'].join('\r\n'),
			errors,
			output: ['dedent`', '  one', '  two', '`'].join('\r\n'),
		},
		{
			options: [{
				tags: ['customIndentableTag'],
			}],
			code: fixInput(`
				foo = customIndentableTag\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
				foo = differentTagThatMightBeWhitespaceSensitive\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
				foo = \`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
			`),
			errors,
			output: fixInput(`
				foo = customIndentableTag\`
				••one
				••two
				••••three
				\`
				foo = differentTagThatMightBeWhitespaceSensitive\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
				foo = \`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
			`),
		},
		{
			options: [{
				tags: ['customIndentableTag'],
				selectors: [':not(TaggedTemplateExpression) > TemplateLiteral'],
			}],
			code: fixInput(`
				foo = customIndentableTag\`
				••••••••one1
				••••••••two1
				••••••••••three1
				••••••••\`
				foo = differentTagThatMightBeWhitespaceSensitive\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
				foo = \`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
			`),
			errors: [...errors, ...errors],
			output: fixInput(`
				foo = customIndentableTag\`
				••one1
				••two1
				••••three1
				\`
				foo = differentTagThatMightBeWhitespaceSensitive\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
				foo = \`
				••one
				••two
				••••three
				\`
			`),
		},
		{
			code: fixInput(`
				function foo() {
				••return dedent\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
				}
			`),
			errors,
			output: fixInput(`
				function foo() {
				••return dedent\`
				••••one
				••••two
				••••••three
				••\`
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
				••return dedent\`
				••••••••one
				••••••••two
				••••••••••three \${3} four
				••••••••••••five
				••••••••••••••\${{f: 5}}
				••••••••••••six
				••••••••\`
				}
			`),
			errors,
			output: fixInput(`
				// a
				// bb
				// ccc
				// dddd
				function foo() {
				••return dedent\`
				••••one
				••••two
				••••••three \${3} four
				••••••••five
				••••••••••\${{f: 5}}
				••••••••six
				••\`
				}
			`),
		},
		{
			code: fixInput(`
				foo = gql\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
				foo = sql\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
				foo = dedent\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
				foo = outdent\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
				foo = somethingElse\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
			`),
			errors: [...errors, ...errors, ...errors, ...errors],
			output: fixInput(`
				foo = gql\`
				••one
				••two
				••••three
				\`
				foo = sql\`
				••one
				••two
				••••three
				\`
				foo = dedent\`
				••one
				••two
				••••three
				\`
				foo = outdent\`
				••one
				••two
				••••three
				\`
				foo = somethingElse\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
			`),
		},
		{
			code: fixInput(`
				foo = stripIndent(\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`)
			`),
			errors,
			output: fixInput(`
				foo = stripIndent(\`
				••one
				••two
				••••three
				\`)
			`),
		},
		{
			code: fixInput(`
				html = /* HTML */ \`
				••••••••<div>
				••••••••••<span>hello</span>
				••••••••</div>
				••••••••\`
			`),
			errors,
			output: fixInput(`
				html = /* HTML */ \`
				••<div>
				••••<span>hello</span>
				••</div>
				\`
			`),
		},
		{
			code: fixInput(`
				html = /* html */ \`
				••••••••<div>
				••••••••••<span>hello</span>
				••••••••</div>
				••••••••\`
			`),
			errors,
			output: fixInput(`
				html = /* html */ \`
				••<div>
				••••<span>hello</span>
				••</div>
				\`
			`),
		},
		{
			code: fixInput(`
				html = /* indent */ \`
				••••••••<div>
				••••••••••<span>hello</span>
				••••••••</div>
				••••••••\`
			`),
			errors,
			output: fixInput(`
				html = /* indent */ \`
				••<div>
				••••<span>hello</span>
				••</div>
				\`
			`),
		},
		{
			options: [{
				comments: ['please indent me!'],
			}],
			code: fixInput(`
				html = /* please indent me! */ \`
				••••••••<div>
				••••••••••<span>hello</span>
				••••••••</div>
				••••••••\`
			`),
			errors,
			output: fixInput(`
				html = /* please indent me! */ \`
				••<div>
				••••<span>hello</span>
				••</div>
				\`
			`),
		},
		{
			options: [{
				indent: 10,
			}],
			code: fixInput(`
				foo = dedent\`
				••one
				••two
				••••three
				\`
			`),
			errors,
			output: fixInput(`
				foo = dedent\`
				••••••••••one
				••••••••••two
				••••••••••••three
				\`
			`),
		},
		{
			options: [{
				indent: '\t\t\t\t',
			}],
			code: fixInput(`
				foo = dedent\`
				••one
				••two
				••••three
				\`
			`),
			errors,
			output: fixInput(`
				foo = dedent\`
				→→→→→→→→one
				→→→→→→→→two
				→→→→→→→→••three
				\`
			`),
		},
		{
			options: [{
				selectors: ['* TemplateLiteral', '* > TemplateLiteral'],
			}],
			code: fixInput(`
				foo = \`
				one
				two
				••three
				\`
			`),
			// Make sure we only report one error, even when multiple selectors match
			errors,
			output: fixInput(`
				foo = \`
				••one
				••two
				••••three
				\`
			`),
		},
		{
			options: [{
				selectors: ['* > TemplateLiteral'],
				comments: ['indentme'],
			}],
			code: fixInput(`
				foo = /* INDENTME */ \`
				one
				two
				••three
				\`
			`),
			// Make sure we only report one error, even when multiple selectors match
			errors,
			output: fixInput(`
				foo = /* INDENTME */ \`
				••one
				••two
				••••three
				\`
			`),
		},
		{
			options: [{
				functions: ['customDedentFunction'],
			}],
			code: fixInput(`
				foo = customDedentFunction(\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`)
				foo = customDedentFunction('some-other-arg', \`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`)
			`),
			errors: [...errors, ...errors],
			output: fixInput(`
				foo = customDedentFunction(\`
				••one
				••two
				••••three
				\`)
				foo = customDedentFunction('some-other-arg', \`
				••one
				••two
				••••three
				\`)
			`),
		},
		{
			code: fixInput(`
				outdent\`
				before
				before\${
				expression
				}after
				after
				\`
			`),
			errors,
			output: fixInput(`
				outdent\`
				••before
				••before\${
				expression
				}after
				••after
				\`
			`),
		},
		{
			code: fixInput(`
				outdent\`
				••before
				••before\${
				→→→→→→outdent\`
				inner
				→→→→→→\`
				}after
				••after
				\`
			`),
			errors,
			output: fixInput(`
				outdent\`
				••before
				••before\${
				→→→→→→outdent\`
				→→→→→→→→inner
				→→→→→→\`
				}after
				••after
				\`
			`),
		},
	],
	/** @type {import('eslint').RuleTester.ValidTestCase[]} */
	valid: [
		'foo = dedent`one two three`',
		fixInput(`
			function f() {
			→→foo = dedent\`
			→→→→one
			→→→→two
			→→→→→→three
			→→→→four
			→→\`
			}
		`),
		fixInput(`
			function f() {
			→→foo = dedent\`
			→→→→one

			→→→→two
			→→→→→→three
			→→→→four
			→→\`
			}
		`),
		fixInput(`
			function f() {
			••foo = dedent\`
			••••one
			••••two
			••••••three
			••••four
			••\`
			}
		`),
		{
			options: [{
				tags: ['somethingOtherThanDedent'],
				functions: ['somethingOtherThanStripIndent'],
			}],
			code: fixInput(`
				foo = stripIndent(\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`)
				foo = dedent\`
				••••••••one
				••••••••two
				••••••••••three
				••••••••\`
			`),
		},
		'stripIndent(foo)',
		{
			options: [{
				selectors: ['TemplateElement'],
			}],
			// Bad selector; no template literal match
			code: fixInput(`
				foo = \`
				••••••one
				••••••two
				••••••••three
				\`
			`),
		},
		'``',
		{
			options: [{
				comments: [],
			}],
			code: fixInput(`
				foo = /* indent */ \`
				••••••one
				••••••two
				••••••••three
				\`
			`),
		},
		fixInput(`
			outdent\`
			••before
			••before\${
			expression
			}after
			••after
			\`
		`),
		fixInput(`
			outdent\`
			••before
			••before\${
			••••••normalTemplate\`
			inner
			••••••\`
			}after
			••after
			\`
		`),
	],
});

// `expect().toMatchInlineSnapshot()`
const INVALID_SNAPSHOT = `\`
    one
      three
      \`
`;
test.snapshot({
	valid: [
		`expect(foo)[toMatchInlineSnapshot](${INVALID_SNAPSHOT})`,
		`expect(foo).toMatchInlineSnapshot?.(${INVALID_SNAPSHOT})`,
		`expect(foo)?.toMatchInlineSnapshot(${INVALID_SNAPSHOT})`,
		`expect(foo).toMatchInlineSnapshot(${INVALID_SNAPSHOT}, extraArgument)`,
		`expect(foo).toMatchInlineSnapshot(extraArgument, ${INVALID_SNAPSHOT})`,
		'expect(foo).toMatchInlineSnapshot()',
		`expect(foo, extraArgument).toMatchInlineSnapshot(${INVALID_SNAPSHOT})`,
		`expect().toMatchInlineSnapshot(${INVALID_SNAPSHOT})`,
		`expect(foo).notToMatchInlineSnapshot(${INVALID_SNAPSHOT})`,
		`assert.expect(foo).toMatchInlineSnapshot(${INVALID_SNAPSHOT})`,
		`expect.toMatchInlineSnapshot(${INVALID_SNAPSHOT})`,
		`notExpect(foo).toMatchInlineSnapshot(${INVALID_SNAPSHOT})`,
		`new expect(foo).toMatchInlineSnapshot(${INVALID_SNAPSHOT})`,
		`new (expect(foo).toMatchInlineSnapshot)(${INVALID_SNAPSHOT})`,
		outdent`
			expect(foo).toMatchInlineSnapshot(\`
				foo
				bar
			\`)
		`,
	],
	invalid: [
		`expect(foo).toMatchInlineSnapshot(${INVALID_SNAPSHOT})`,
	]
});
