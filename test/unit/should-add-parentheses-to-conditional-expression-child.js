import test from 'node:test';
import {Linter} from 'eslint';
import {getConditionalExpressionChildText} from '../../rules/utils/index.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

/*
Return `getConditionalExpressionChildText` for the argument of each `inspect(…)` call.
*/
const getResults = code => {
	const results = [];
	const linter = new Linter();
	const messages = linter.verify(code, {
		files: ['**/*.ts'],
		languageOptions: {parser: typescriptEslintParser},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'CallExpression[callee.name="inspect"]'(node) {
								results.push(getConditionalExpressionChildText(node.arguments[0], context));
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	}, 'file.ts');

	if (messages.length > 0) {
		throw new Error(messages.map(message => message.message).join('\n'));
	}

	return results;
};

test('`getConditionalExpressionChildText` adds parentheses for lower precedence children', t => {
	for (const [code, expected] of [
		['inspect(foo);', 'foo'],
		['inspect(a || b);', 'a || b'],
		['inspect(a ? b : c);', 'a ? b : c'],
		['inspect(foo!);', 'foo!'],
		['inspect(a = b);', '(a = b)'],
		['inspect((a, b));', '(a, b)'],
		['inspect(foo as Foo);', '(foo as Foo)'],
		['inspect(<Foo>foo);', '(<Foo>foo)'],
		['async () => inspect(await foo);', '(await foo)'],
	]) {
		t.assert.deepStrictEqual(getResults(code), [expected], code);
	}
});

test('`getConditionalExpressionChildText` keeps existing parentheses', t => {
	for (const [code, expected] of [
		['inspect((foo));', '(foo)'],
		['inspect((a = b));', '(a = b)'],
		['inspect(((a = b)));', '((a = b))'],
		['inspect((/* comment */ foo));', '(/* comment */ foo)'],
	]) {
		t.assert.deepStrictEqual(getResults(code), [expected], code);
	}
});
