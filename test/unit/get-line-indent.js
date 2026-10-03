import test from 'node:test';
import {Linter} from 'eslint';
import outdent from 'outdent';
import getLineIndent from '../../rules/utils/get-line-indent.js';
import getIndentString from '../../rules/utils/get-indent-string.js';

const linter = new Linter();

// Returns `[lineIndent, indentString]` for the first `Identifier` named `target` and for the comment before it, if any.
const capture = code => {
	let result;
	linter.verify(code, {
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							Identifier(node) {
								if (node.name !== 'target' || result) {
									return;
								}

								const [comment] = context.sourceCode.getCommentsBefore(node);
								result = {
									lineIndent: getLineIndent(node, context),
									indentString: getIndentString(node, context),
									commentLineIndent: comment && getLineIndent(comment, context),
									tokenLineIndent: getLineIndent(context.sourceCode.getFirstToken(node), context),
								};
							},
						}),
					},
				},
			},
		},
		rules: {
			'test/capture': 'error',
		},
	});

	if (!result) {
		throw new Error('Expected to find `target`.');
	}

	return result;
};

test('returns the indentation of the line the node starts on', t => {
	t.assert.strictEqual(capture('target;').lineIndent, '');
	t.assert.strictEqual(capture('\ttarget;').lineIndent, '\t');
	t.assert.strictEqual(capture('  target;').lineIndent, '  ');
	t.assert.strictEqual(capture(outdent`
		function foo() {
		\t\ttarget;
		}
	`).lineIndent, '\t\t');
});

test('ignores where on the line the node sits, unlike `getIndentString()`', t => {
	const result = capture('\tfoo = target;');
	t.assert.strictEqual(result.lineIndent, '\t');
	t.assert.strictEqual(result.indentString, ' ');
	t.assert.strictEqual(capture('  const value = foo(target);').lineIndent, '  ');
	t.assert.strictEqual(capture('\tfoo(); target;').lineIndent, '\t');
});

test('accepts tokens and comments', t => {
	const result = capture(outdent`
		function foo() {
		\t\t// comment
		\t\ttarget;
		}
	`);
	t.assert.strictEqual(result.tokenLineIndent, '\t\t');
	t.assert.strictEqual(result.commentLineIndent, '\t\t');
});

test('keeps mixed tabs and spaces', t => {
	t.assert.strictEqual(capture('\t  target;').lineIndent, '\t  ');
});

test('only counts tabs and spaces', t => {
	t.assert.strictEqual(capture('\u00A0target;').lineIndent, '');
	t.assert.strictEqual(capture(' \u00A0target;').lineIndent, ' ');
});

test('handles CRLF line endings', t => {
	t.assert.strictEqual(capture('foo();\r\n  target;\r\n').lineIndent, '  ');
});
