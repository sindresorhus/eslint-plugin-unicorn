import test from 'node:test';
import {Linter} from 'eslint';
import {getLogicalExpressionChildText, shouldAddParenthesesToLogicalExpressionChild} from '../../rules/utils/index.js';

test('requires the `property` option', t => {
	const node = {type: 'Identifier', name: 'value'};

	t.assert.strictEqual(shouldAddParenthesesToLogicalExpressionChild(node, {operator: '&&', property: 'left'}), false);
	t.assert.throws(() => shouldAddParenthesesToLogicalExpressionChild(node, {operator: '&&'}), {message: '`property` is required.'});
});

/*
Return `getLogicalExpressionChildText` for the argument of each `inspect(…)` call.
*/
const getChildTexts = (code, options) => {
	const results = [];
	const linter = new Linter();
	const messages = linter.verify(code, {
		languageOptions: {ecmaVersion: 'latest'},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'CallExpression[callee.name="inspect"]'(node) {
								results.push(getLogicalExpressionChildText(node.arguments[0], context, options));
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	});

	if (messages.length > 0) {
		throw new Error(messages.map(message => message.message).join('\n'));
	}

	return results;
};

test('`getLogicalExpressionChildText` adds parentheses for lower precedence children', t => {
	const options = {operator: '&&', property: 'left'};
	for (const [code, expected] of [
		['inspect(foo);', 'foo'],
		['inspect(foo.bar());', 'foo.bar()'],
		['inspect(a && b);', 'a && b'],
		['inspect(a || b);', '(a || b)'],
		['inspect(a ?? b);', '(a ?? b)'],
		['inspect(a === b);', '(a === b)'],
		['inspect(a ? b : c);', '(a ? b : c)'],
		['inspect(a = b);', '(a = b)'],
		['inspect(() => a);', '(() => a)'],
		['inspect((a, b));', '(a, b)'],
	]) {
		t.assert.deepStrictEqual(getChildTexts(code, options), [expected], code);
	}

	t.assert.deepStrictEqual(getChildTexts('inspect(a || b);', {operator: '||', property: 'right'}), ['a || b']);
});

test('`getLogicalExpressionChildText` keeps existing parentheses', t => {
	const options = {operator: '&&', property: 'left'};
	for (const [code, expected] of [
		['inspect((foo));', '(foo)'],
		['inspect((a || b));', '(a || b)'],
		['inspect(((a || b)));', '((a || b))'],
	]) {
		t.assert.deepStrictEqual(getChildTexts(code, options), [expected], code);
	}
});
