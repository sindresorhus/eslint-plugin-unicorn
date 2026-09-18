import {Linter} from 'eslint';
import test from 'ava';
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
	t.is(capture('target;').lineIndent, '');
	t.is(capture('\ttarget;').lineIndent, '\t');
	t.is(capture('  target;').lineIndent, '  ');
	t.is(capture(outdent`
		function foo() {
		\t\ttarget;
		}
	`).lineIndent, '\t\t');
});

test('ignores where on the line the node sits, unlike `getIndentString()`', t => {
	const result = capture('\tfoo = target;');
	t.is(result.lineIndent, '\t');
	t.is(result.indentString, ' ');
	t.is(capture('  const value = foo(target);').lineIndent, '  ');
	t.is(capture('\tfoo(); target;').lineIndent, '\t');
});

test('accepts tokens and comments', t => {
	const result = capture(outdent`
		function foo() {
		\t\t// comment
		\t\ttarget;
		}
	`);
	t.is(result.tokenLineIndent, '\t\t');
	t.is(result.commentLineIndent, '\t\t');
});

test('keeps mixed tabs and spaces', t => {
	t.is(capture('\t  target;').lineIndent, '\t  ');
});

test('only counts tabs and spaces', t => {
	t.is(capture('\u00A0target;').lineIndent, '');
	t.is(capture(' \u00A0target;').lineIndent, ' ');
});

test('handles CRLF line endings', t => {
	t.is(capture('foo();\r\n  target;\r\n').lineIndent, '  ');
});
