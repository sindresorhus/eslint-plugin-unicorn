import test from 'node:test';
import {Linter} from 'eslint';
import {getConstVariableInitializer} from '../../rules/utils/index.js';

/*
Return the source text of the `getConstVariableInitializer` result for the argument of each `inspect(…)` call.
*/
const getResults = code => {
	const results = [];
	const linter = new Linter();
	linter.verify(code, {
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'CallExpression[callee.name="inspect"]'(node) {
								const initializer = getConstVariableInitializer(node.arguments[0], context);
								results.push(initializer && context.sourceCode.getText(initializer));
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	});

	return results;
};

test('returns the initializer of a `const` variable', t => {
	t.assert.deepStrictEqual(getResults('const a = foo(); inspect(a);'), ['foo()']);
	t.assert.deepStrictEqual(getResults('const a = 1, b = 2; inspect(b);'), ['2']);
});

test('returns `undefined` for destructured bindings', t => {
	for (const code of [
		'const {a} = object; inspect(a);',
		'const {b: a} = object; inspect(a);',
		'const [a] = array; inspect(a);',
		'const {a = 1} = object; inspect(a);',
	]) {
		t.assert.deepStrictEqual(getResults(code), [undefined], code);
	}
});

test('returns `undefined` for non-`const` and non-variable bindings', t => {
	for (const code of [
		'let a = 1; inspect(a);',
		'var a = 1; inspect(a);',
		'function a() {} inspect(a);',
		'function foo(a) { inspect(a); }',
		'inspect(a);',
		'const a = 1; inspect(a.b);',
	]) {
		t.assert.deepStrictEqual(getResults(code), [undefined], code);
	}
});
