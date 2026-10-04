import test from 'node:test';
import {Linter} from 'eslint';
import getEnclosingFunction from '../../rules/utils/get-enclosing-function.js';

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
								const functionNode = getEnclosingFunction(node);
								results.push(functionNode && context.sourceCode.getText(functionNode));
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

test('finds the closest enclosing function', t => {
	t.assert.deepStrictEqual(getResults('function outer() { const inner = () => marker; }'), ['() => marker']);
	t.assert.deepStrictEqual(getResults('function outer() { if (a) { marker; } }'), ['function outer() { if (a) { marker; } }']);
	t.assert.deepStrictEqual(getResults('class A { method() { marker; } }'), ['() { marker; }']);
});

test('does not return the node itself', t => {
	const results = [];
	linter.verify('function outer() { function inner() {} }', {
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'FunctionDeclaration[id.name="inner"]'(node) {
								results.push(context.sourceCode.getText(getEnclosingFunction(node)));
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});
	t.assert.deepStrictEqual(results, ['function outer() { function inner() {} }']);
});

test('returns `undefined` outside functions', t => {
	t.assert.deepStrictEqual(getResults('marker;'), [undefined]);
});
