import test from 'node:test';
import {Linter} from 'eslint';
import isSameBinding from '../../rules/utils/is-same-binding.js';

const linter = new Linter();

const getResult = code => {
	let result;
	linter.verify(code, {
		languageOptions: {ecmaVersion: 'latest', sourceType: 'module'},
		plugins: {
			test: {
				rules: {
					capture: {
						create(context) {
							const identifiers = [];
							return {
								'CallExpression[callee.name=/^(?:left|right)$/] > .arguments'(node) {
									identifiers.push(node);
								},
								'Program:exit'() {
									result = isSameBinding(identifiers[0], identifiers[1], context);
								},
							};
						},
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});
	return result;
};

test('identifiers that resolve to the same variable', t => {
	t.assert.strictEqual(getResult('const foo = 1; left(foo); right(foo);'), true);
	t.assert.strictEqual(getResult('let foo; function bar() { left(foo); } right(foo);'), true);
});

test('identifiers that resolve to different variables', t => {
	t.assert.strictEqual(getResult('const foo = 1; left(foo); { const foo = 2; right(foo); }'), false);
	t.assert.strictEqual(getResult('const foo = 1; const bar = 1; left(foo); right(bar);'), false);
	t.assert.strictEqual(getResult('const foo = 1; left(foo); function bar(foo) { right(foo); }'), false);
});

test('unresolved identifiers compare by name', t => {
	t.assert.strictEqual(getResult('left(foo); right(foo);'), true);
	t.assert.strictEqual(getResult('left(foo); right(bar);'), false);
	t.assert.strictEqual(getResult('left(foo); { const foo = 1; right(foo); }'), false);
});
