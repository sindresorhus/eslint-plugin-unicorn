import test from 'node:test';
import {Linter} from 'eslint';
import isSameStatement from '../../rules/utils/is-same-statement.js';
import {isElseIfStatement} from '../../rules/ast/index.js';

const linter = new Linter();

const getBranchComparison = code => {
	let result;
	linter.verify(code, {
		languageOptions: {ecmaVersion: 'latest', sourceType: 'module'},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'Program > IfStatement'(node) {
								result = isSameStatement(node.consequent, node.alternate, context);
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	});
	return result;
};

test('statements with the same tokens are the same', t => {
	t.assert.strictEqual(getBranchComparison('if (a) foo(); else foo();'), true);
	t.assert.strictEqual(getBranchComparison('if (a) foo() \n else foo();'), true);
	t.assert.strictEqual(getBranchComparison('if (a) foo( /* comment */ 1 ); else foo(1);'), true);
	t.assert.strictEqual(getBranchComparison('if (a) {\n\tfoo();\n} else { foo(); }'), true);
});

test('statements with different tokens are not the same', t => {
	t.assert.strictEqual(getBranchComparison('if (a) foo(); else bar();'), false);
	t.assert.strictEqual(getBranchComparison('if (a) foo(1); else foo(\'1\');'), false);
	t.assert.strictEqual(getBranchComparison('if (a) { foo(); } else foo();'), false);
});

test('empty statements are never the same', t => {
	t.assert.strictEqual(getBranchComparison('if (a) ; else ;'), false);
});

const getElseIfResults = code => {
	const results = [];
	linter.verify(code, {
		plugins: {
			test: {
				rules: {
					capture: {
						create: () => ({
							IfStatement(node) {
								results.push(isElseIfStatement(node));
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

test('detects `else if` statements', t => {
	t.assert.deepStrictEqual(getElseIfResults('if (a) {} else if (b) {} else if (c) {}'), [false, true, true]);
	t.assert.deepStrictEqual(getElseIfResults('if (a) { if (b) {} } else { if (c) {} }'), [false, false, false]);
	t.assert.deepStrictEqual(getElseIfResults('if (a) if (b) {}'), [false, false]);
});
