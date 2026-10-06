import test from 'node:test';
import {Linter} from 'eslint';
import isFirstTokenOfExpressionStatement from '../../rules/utils/is-first-token-of-expression-statement.js';

const linter = new Linter();

const getResults = code => {
	const results = [];
	linter.verify(code, {
		languageOptions: {ecmaVersion: 'latest', sourceType: 'module'},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'Identifier[name="marker"]'(node) {
								results.push(isFirstTokenOfExpressionStatement(node, context));
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});
	return results;
};

test('detects a node that starts an expression statement', t => {
	t.assert.deepStrictEqual(getResults('marker;'), [true]);
	t.assert.deepStrictEqual(getResults('marker.foo();'), [true]);
	t.assert.deepStrictEqual(getResults('marker + 1;'), [true]);
	t.assert.deepStrictEqual(getResults('marker`foo`;'), [true]);
	t.assert.deepStrictEqual(getResults('foo(() => { marker.bar(); });'), [true]);
});

test('ignores nodes that do not start an expression statement', t => {
	t.assert.deepStrictEqual(getResults('foo(marker);'), [false]);
	t.assert.deepStrictEqual(getResults('1 + marker;'), [false]);
	t.assert.deepStrictEqual(getResults('(marker);'), [false]);
	t.assert.deepStrictEqual(getResults('(marker).foo();'), [false]);
	t.assert.deepStrictEqual(getResults('foo(() => marker);'), [false]);
	t.assert.deepStrictEqual(getResults('const foo = marker;'), [false]);
	t.assert.deepStrictEqual(getResults('if (marker) {}'), [false]);
});
