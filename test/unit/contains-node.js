import test from 'node:test';
import {Linter} from 'eslint';
import {isFunction} from '../../rules/ast/index.js';
import {containsNode} from '../../rules/utils/index.js';
import {DEFAULT_LANGUAGE_OPTIONS} from '../utils/language-options.js';

const isReturnStatement = node => node.type === 'ReturnStatement';

/*
Return the `containsNode` result for the body of each function named `inspect`.
*/
const getResults = (code, predicate, shouldSkip) => {
	const results = [];
	const linter = new Linter();
	linter.verify(code, {
		files: ['**'],
		languageOptions: DEFAULT_LANGUAGE_OPTIONS,
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'FunctionDeclaration[id.name="inspect"]'(node) {
								results.push(containsNode(node.body, context, predicate, shouldSkip));
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

test('matches the node itself', t => {
	t.assert.deepStrictEqual(getResults('function inspect() {}', node => node.type === 'BlockStatement'), [true]);
});

test('matches a deeply nested node', t => {
	t.assert.deepStrictEqual(getResults('function inspect() { if (a) { while (b) { return; } } }', isReturnStatement), [true]);
	t.assert.deepStrictEqual(getResults('function inspect() { foo(bar, [baz, {qux: `a`}]); }', node => node.type === 'TemplateLiteral'), [true]);
});

test('returns `false` when nothing matches', t => {
	t.assert.deepStrictEqual(getResults('function inspect() { foo(); }', isReturnStatement), [false]);
	t.assert.deepStrictEqual(getResults('function inspect() {}', isReturnStatement), [false]);
});

test('searches nested functions without `shouldSkip`', t => {
	t.assert.deepStrictEqual(getResults('function inspect() { foo(() => { return; }); }', isReturnStatement), [true]);
});

test('does not search inside skipped nodes', t => {
	t.assert.deepStrictEqual(getResults('function inspect() { foo(() => { return; }); }', isReturnStatement, isFunction), [false]);
	t.assert.deepStrictEqual(getResults('function inspect() { function bar() { return; } }', isReturnStatement, isFunction), [false]);
	t.assert.deepStrictEqual(getResults('function inspect() { foo(() => {}); return; }', isReturnStatement, isFunction), [true]);
});

test('still checks skipped nodes with the predicate', t => {
	t.assert.deepStrictEqual(getResults('function inspect() { function bar() {} }', node => node.type === 'FunctionDeclaration', isFunction), [true]);
});

test('does not search inside a skipped root node', t => {
	t.assert.deepStrictEqual(getResults('function inspect() { return; }', isReturnStatement, node => node.type === 'BlockStatement'), [false]);
});
