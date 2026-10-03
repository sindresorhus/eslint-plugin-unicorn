import test from 'node:test';
import {Linter} from 'eslint';
import {getParentheses} from '../../rules/utils/parentheses/parentheses.js';

const linter = new Linter();

/*
Return how many parentheses surround each `foo` identifier in `code`, not counting the parentheses of the parent syntax.
*/
const getParenthesesCounts = (code, sourceType = 'module') => {
	const counts = [];

	const messages = linter.verify(code, {
		languageOptions: {sourceType},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'Identifier[name="foo"]'(node) {
								counts.push(getParentheses(node, context).length / 2);
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});

	const fatalMessage = messages.find(message => message.fatal);
	if (fatalMessage) {
		throw new Error(fatalMessage.message);
	}

	return counts;
};

test('the parentheses of `import()` are not counted', t => {
	t.assert.deepStrictEqual(getParenthesesCounts('import(foo);'), [0]);
	t.assert.deepStrictEqual(getParenthesesCounts('import((foo));'), [1]);
	t.assert.deepStrictEqual(getParenthesesCounts('import(bar, (foo));'), [1]);
});

test('the parentheses of `switch` are not counted', t => {
	t.assert.deepStrictEqual(getParenthesesCounts('switch (foo) {}'), [0]);
	t.assert.deepStrictEqual(getParenthesesCounts('switch (((foo))) { case (foo): }'), [2, 1]);
});

test('the parentheses of `with` are not counted', t => {
	t.assert.deepStrictEqual(getParenthesesCounts('with (foo) {}', 'script'), [0]);
	t.assert.deepStrictEqual(getParenthesesCounts('with ((foo)) (foo);', 'script'), [1, 1]);
});

test('the parentheses of a `catch` clause parameter are not counted', t => {
	t.assert.deepStrictEqual(getParenthesesCounts('try {} catch (foo) {}'), [0]);
});
