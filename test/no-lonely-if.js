import test from 'ava';
import {ESLint} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';
import {getTester} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

function createEslint(overrideConfig) {
	return new ESLint({
		overrideConfigFile: true,
		fix: true,
		ignore: false,
		overrideConfig,
	});
}

function createNoLonelyIfEslint(rules, plugins = {}) {
	return createEslint({
		plugins: {
			unicorn: plugin,
			...plugins,
		},
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		rules: {
			'unicorn/no-lonely-if': 'error',
			...rules,
		},
	});
}

async function lintFixture(code, rules, plugins) {
	const eslint = createNoLonelyIfEslint(rules, plugins);
	const [result] = await eslint.lintText(code, {filePath: 'fixture.js'});
	return result;
}

const hasRuleMessage = (result, ruleId) =>
	result.messages.some(message => message.ruleId === ruleId);

const pragmaAttachmentRule = {
	meta: {},
	create(context) {
		const {sourceCode} = context;

		return {
			IfStatement(node) {
				if (
					node.test.type !== 'LogicalExpression'
					|| node.test.operator !== '&&'
				) {
					return;
				}

				const [nodeStart] = sourceCode.getRange(node);
				const commentsBefore = sourceCode.getCommentsBefore(node);
				const attachedComment = commentsBefore.at(-1);

				if (!attachedComment) {
					context.report({
						node,
						message: 'Merged `if` is missing attached pragma comment.',
					});
					return;
				}

				const commentGap = sourceCode.text.slice(sourceCode.getRange(attachedComment)[1], nodeStart);
				if (
					commentGap.trim() !== ''
					|| !attachedComment.value.includes('@keep-next')
				) {
					context.report({
						node,
						message: 'Merged `if` is missing attached pragma comment.',
					});
				}
			},
		};
	},
};

const pragmaAttachmentPlugins = {
	fake: {
		rules: {
			'pragma-attachment': pragmaAttachmentRule,
		},
	},
};

ruleTest.snapshot({
	valid: [
		outdent`
			if (a) {
				if (b) {
				}
			} else {}
		`,
		outdent`
			if (a) {
				if (b) {
				}
				foo();
			} else {}
		`,
		outdent`
			if (a) {
			} else {
				if (y) {}
			}
		`,
		outdent`
			if (a) {
				b ? c() : d()
			}
		`,
	],
	invalid: [
		outdent`
			if (a) {
				if (b) {
				}
			}
		`,
		// Inner one is `BlockStatement`
		outdent`
			if (a) if (b) {
				foo();
			}
		`,
		// Outer one is `BlockStatement`
		outdent`
			if (a) {
				if (b) foo();
			}
		`,
		outdent`
			if (a) /* comment */ {
				if (b) foo();
			}
		`,
		// No `BlockStatement`
		'if (a) if (b) foo();',
		outdent`
			if (a) {
				if (b) foo()
			}
		`,
		// `EmptyStatement`
		'if (a) if (b);',
		// Nested
		outdent`
			if (a) {
				if (b) {
					// Should not report
				}
			} else if (c) {
				if (d) {
				}
			}
		`,
		// Need parenthesis
		outdent`
			function * foo() {
				if (a || b)
				if (a ?? b)
				if (a ? b : c)
				if (a = b)
				if (a += b)
				if (a -= b)
				if (a &&= b)
				if (yield a)
				if (a, b);
			}
		`,
		// Should not add parenthesis
		outdent`
			async function foo() {
				if (a)
				if (await a)
				if (a.b)
				if (a && b);
			}
		`,
		// Don't case parenthesis in outer test
		'if (((a || b))) if (((c || d)));',
		// Comments
		outdent`
			if // 1
			(
				// 2
				a // 3
					.b // 4
			) // 5
			{
				// 6
				if (
					// 7
					c // 8
						.d // 9
				) {
					// 10
					foo();
					// 11
				}
				// 12
			}
		`,
		// Semicolon
		outdent`
			if (a) {
				if (b) foo()
			}
			[].forEach(bar)
		`,
		outdent`
			if (a)
				if (b) foo()
			;[].forEach(bar)
		`,
		outdent`
			if (a) {
				if (b) foo()
			}
			;[].forEach(bar)
		`,
		outdent`
			if (a) /* comment */ {
				if (b) foo()
			}
		`,
	],
});

test('fix should not produce invalid code when another rule replaces the original range', async t => {
	const code = outdent`
		function some(value) {
		    if (value < 10) {
		        if (value < 5) {
		            console.log('this is a long string this is a long string this is a long string this is a long string', value);
		        }
		    }
		    return 0
		}
	`;

	const fakeFormattingRule = {
		meta: {
			fixable: 'code',
		},
		create(context) {
			return {
				Program(node) {
					context.report({
						node,
						message: 'format',
						fix(fixer) {
							const source = context.sourceCode.text;
							const formatted = source.includes('value < 10 && value < 5')
								? outdent`
									function some(value) {
									  if (value < 10 && value < 5) {
									    console.log(
									      'this is a long string this is a long string this is a long string this is a long string',
									      value,
									    );
									  }
									  return 0;
									}
								`
								: outdent`
									function some(value) {
									  if (value < 10) {
									    if (value < 5) {
									      console.log(
									        'this is a long string this is a long string this is a long string this is a long string',
									        value,
									      );
									    }
									  }
									  return 0;
									}
								`;

							if (formatted === source) {
								return;
							}

							return fixer.replaceTextRange([0, source.length], formatted);
						},
					});
				},
			};
		},
	};

	const eslint = createEslint({
		plugins: {
			unicorn: plugin,
			fake: {
				rules: {
					format: fakeFormattingRule,
				},
			},
		},
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		rules: {
			'unicorn/no-lonely-if': 'error',
			'fake/format': 'error',
		},
	});

	const [result] = await eslint.lintText(code, {filePath: 'fixture.js'});
	const fatalMessages = result.messages.filter(({fatal}) => fatal);

	t.false(fatalMessages.length > 0);
	t.is(result.output, outdent`
		function some(value) {
		  if (value < 10 && value < 5) {
		    console.log(
		      'this is a long string this is a long string this is a long string this is a long string',
		      value,
		    );
		  }
		  return 0;
		}
	`);
});

test('fix should preserve text between the outer condition and block', async t => {
	const result = await lintFixture('if (a) /* comment */ { if (b) { foo(); } }');

	t.is(result.output, '/* comment */ if (a && b) { foo(); }');
});

test('fix should preserve text between the outer condition and non-block consequent', async t => {
	const result = await lintFixture('if (a) /* comment */ { if (b) foo(); }');

	t.is(result.output, '/* comment */ if (a && b) foo();');
});

test('fix should preserve comments before the inner if inside the outer block', async t => {
	const result = await lintFixture('if (a) { /* before */ if (b) foo(); }');

	t.is(result.output, '/* before */ if (a && b) foo();');
});

test('fix should preserve comments after the inner if inside the outer block', async t => {
	const result = await lintFixture('if (a) { if (b) foo(); /* after */ }');

	t.is(result.output, 'if (a && b) foo(); /* after */ ');
});

test('fix should keep pragma comments from before the inner if attached to the merged if', async t => {
	const result = await lintFixture(
		'if (a) { /* @keep-next */ if (b) foo(); }',
		{'fake/pragma-attachment': 'error'},
		pragmaAttachmentPlugins,
	);

	t.is(result.output, '/* @keep-next */ if (a && b) foo();');
	t.false(hasRuleMessage(result, 'fake/pragma-attachment'));
});

test('fix should keep pragma comments from the outer condition gap attached to the merged if', async t => {
	const result = await lintFixture(
		'if (a) /* @keep-next */ { if (b) foo(); }',
		{'fake/pragma-attachment': 'error'},
		pragmaAttachmentPlugins,
	);

	t.is(result.output, '/* @keep-next */ if (a && b) foo();');
	t.false(hasRuleMessage(result, 'fake/pragma-attachment'));
});

test('fix should preserve eslint-disable-next-line before the inner if', async t => {
	const result = await lintFixture(outdent`
		if (a) {
			// eslint-disable-next-line no-console
			if (b) console.log('foo');
		}
	`, {'no-console': 'error'});

	t.is(result.output, '// eslint-disable-next-line no-console\n\tif (a && b) console.log(\'foo\');');
	t.false(hasRuleMessage(result, 'no-console'));
});

test('fix should preserve block eslint-disable-next-line before the inner if', async t => {
	const result = await lintFixture(outdent`
		if (a) {
			/* eslint-disable-next-line no-console */
			if (b) console.log('foo');
		}
	`, {'no-console': 'error'});

	t.is(result.output, '/* eslint-disable-next-line no-console */\n\tif (a && b) console.log(\'foo\');');
	t.false(hasRuleMessage(result, 'no-console'));
});

test('fix should preserve eslint-disable-line between the outer condition and block', async t => {
	const result = await lintFixture(outdent`
		if (true) // eslint-disable-line no-constant-condition
		{
			if (true) foo();
		}
	`, {'no-constant-condition': 'error'});

	t.is(result.output, 'if (true && true) // eslint-disable-line no-constant-condition\n foo();');
	t.false(hasRuleMessage(result, 'no-constant-condition'));
});

test('fix should preserve comments inside merged conditions', async t => {
	const result = await lintFixture('if (/* outer */ a) { if (b /* inner */) foo(); }');

	t.is(result.output, 'if (/* outer */ a && b /* inner */) foo();');
});

test('fix should preserve comments between if and opening parenthesis', async t => {
	const result = await lintFixture('if/* outer */(a) if/* inner */(b) foo();');

	t.is(result.output, 'if/* outer */(a && /* inner */b) foo();');
});

test('fix should preserve ASI-safe semicolon insertion when keeping outer-gap text', async t => {
	const result = await lintFixture('if (a) /* comment */ { if (b) foo() } [].forEach(bar)');

	t.is(result.output, '/* comment */ if (a && b) foo();[].forEach(bar)');
	t.false(result.messages.some(message => message.fatal));
});

test('fix should preserve ASI-safe semicolon insertion when keeping trailing text from the outer block', async t => {
	const result = await lintFixture('if (a) { if (b) foo() /* after */ } [].forEach(bar)');

	t.is(result.output, 'if (a && b) foo() /* after */ ;[].forEach(bar)');
	t.false(result.messages.some(message => message.fatal));
});
