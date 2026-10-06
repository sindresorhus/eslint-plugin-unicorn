import test from 'node:test';
import {Linter} from 'eslint';
import {getFunctionOnlyExpression, getFunctionReturnExpression} from '../../rules/utils/function-body.js';

const linter = new Linter();

const getResults = (code, getExpression) => {
	const results = [];
	linter.verify(code, {
		languageOptions: {ecmaVersion: 'latest', sourceType: 'module'},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							':function'(node) {
								const expression = getExpression(node);
								results.push(expression && context.sourceCode.getText(expression));
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

for (const [code, expected] of [
	['x => value', 'value'],
	['x => ({a: x})', '{a: x}'],
	['x => { return value; }', 'value'],
	['function (x) { return value; }', 'value'],
	['async function (x) { return value; }', 'value'],
	['x => { return; }', undefined],
	['x => {}', undefined],
	['x => { value; }', undefined],
	['x => { foo(); return value; }', undefined],
	['x => { if (a) { return value; } }', undefined],
]) {
	test(`return expression of \`${code}\``, t => {
		t.assert.deepStrictEqual(getResults(`(${code});`, getFunctionReturnExpression), [expected]);
	});
}

for (const [code, expected] of [
	['x => value', 'value'],
	['x => { value; }', 'value'],
	['function (x) { foo(x); }', 'foo(x)'],
	['x => { return value; }', undefined],
	['x => {}', undefined],
	['x => { foo(); bar(); }', undefined],
	['x => { const y = 1; }', undefined],
]) {
	test(`only expression of \`${code}\``, t => {
		t.assert.deepStrictEqual(getResults(`(${code});`, getFunctionOnlyExpression), [expected]);
	});
}

test('return expression of methods and declarations', t => {
	t.assert.deepStrictEqual(getResults('function foo() { return 1; } class A { method() { return 2; } }', getFunctionReturnExpression), ['1', '2']);
});
