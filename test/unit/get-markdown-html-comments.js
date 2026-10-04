import test from 'node:test';
import {Linter} from 'eslint';
import markdown from '@eslint/markdown';
import outdent from 'outdent';
import {getMarkdownHtmlComments} from '../../rules/utils/get-comments.js';

const linter = new Linter();

const getCommentsOf = code => {
	let comments;
	const messages = linter.verify(code, {
		files: ['**/*.md'],
		language: 'markdown/commonmark',
		plugins: {
			markdown,
			test: {
				meta: {},
				rules: {
					capture: {
						meta: {languages: ['*']},
						create(context) {
							comments = getMarkdownHtmlComments(context).map(comment => ({
								...comment,
								text: context.sourceCode.text.slice(...comment.range),
							}));
							return {};
						},
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	}, 'file.md');

	if (messages.length > 0) {
		throw new Error(messages[0].message);
	}

	return comments;
};

test('finds block and inline HTML comments', t => {
	const comments = getCommentsOf(outdent`
		# Title

		<!-- block -->

		Text <!-- inline --> more.

		<div>
		<!-- first --> <!-- second -->
		</div>
	`);

	t.assert.deepStrictEqual(comments.map(({type, value, text}) => ({type, value, text})), [
		{type: 'Block', value: ' block ', text: '<!-- block -->'},
		{type: 'Block', value: ' inline ', text: '<!-- inline -->'},
		{type: 'Block', value: ' first ', text: '<!-- first -->'},
		{type: 'Block', value: ' second ', text: '<!-- second -->'},
	]);
	// Markdown locations use 1-based columns
	t.assert.deepStrictEqual(comments[1].loc, {start: {line: 5, column: 6}, end: {line: 5, column: 21}});
});

test('finds multiline and unclosed HTML comments', t => {
	t.assert.deepStrictEqual(getCommentsOf('<!--\nfoo\nbar\n-->\n').map(({value}) => value), ['\nfoo\nbar\n']);
	t.assert.deepStrictEqual(getCommentsOf('<!-- unclosed\n\nfoo\n').map(({value, text}) => ({value, text})), [{value: ' unclosed\n\nfoo\n', text: '<!-- unclosed\n\nfoo\n'}]);
});

test('ignores comment-like text in inline code and code blocks', t => {
	const comments = getCommentsOf(outdent`
		Inline \`<!-- inline code -->\` text.

		    <!-- indented code block -->

		\`\`\`html
		<!-- fenced code block -->
		\`\`\`

		~~~
		<!-- tilde fenced code block -->
		~~~

		<!-- real -->
	`);

	t.assert.deepStrictEqual(comments.map(({value}) => value), [' real ']);
});

test('returns no comments for other languages', t => {
	let comments;
	linter.verify('/* comment */ foo();', {
		plugins: {
			test: {
				rules: {
					capture: {
						create(context) {
							comments = getMarkdownHtmlComments(context);
							return {};
						},
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});

	t.assert.deepStrictEqual(comments, []);
});
