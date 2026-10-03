import test from 'node:test';
import {Linter} from 'eslint';
import {getNewExpressionTokens} from '../../rules/utils/get-call-or-new-expression-tokens.js';

const linter = new Linter();

/*
Return the token values that `getNewExpressionTokens()` finds for the first `new` expression in `code`.
*/
const getTokenValues = code => {
	let values;

	linter.verify(code, {
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							NewExpression(node) {
								const tokens = getNewExpressionTokens(node, context);
								values ??= Object.fromEntries(Object.entries(tokens).map(([name, token]) => [name, token?.value]));
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});

	return values;
};

test('a `new` expression without parentheses has no tokens', t => {
	t.assert.deepStrictEqual(getTokenValues('new Foo;'), {});
});

test('a `new` expression with parentheses', t => {
	t.assert.deepStrictEqual(getTokenValues('new Foo(a,);'), {
		openingParenthesisToken: '(',
		closingParenthesisToken: ')',
		trailingCommaToken: ',',
	});
});
