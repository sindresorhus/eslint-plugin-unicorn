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

test('identical tokens with different automatic semicolon insertion are not the same', t => {
	for (const code of [
		'if (a) callback = () => { return\n42; }; else callback = () => { return 42; };',
		'if (a) callback = function () { return\n42; }; else callback = function () { return 42; };',
		'if (a) callback = function* () { yield\n42; }; else callback = function* () { yield 42; };',
		'if (a) callback = () => { left\n++right; }; else callback = () => { left++\nright; };',
		'if (a) callback = () => { return /*\n*/ 42; }; else callback = () => { return /* */ 42; };',
		'if (a) callback = () => { return\r\n42; }; else callback = () => { return 42; };',
		'if (a) callback = () => { return\u2028 42; }; else callback = () => { return 42; };',
	]) {
		t.assert.strictEqual(getBranchComparison(code), false, code);
	}
});

test('formatting that preserves the AST remains equivalent inside callbacks', t => {
	for (const code of [
		'if (a) callback = () => { return (\n42); }; else callback = () => { return (42); };',
		'if (a) callback = function* () { yield (\n42); }; else callback = function* () { yield (42); };',
		'if (a) callback = () => { left++\n; }; else callback = () => { left++; };',
		'if (a) callback = () => { return /* safe */ 42; }; else callback = () => { return 42; };',
		'if (a) callback = () => { "use strict"; return 42; }; else callback = () => { "use strict"; return 42; };',
	]) {
		t.assert.strictEqual(getBranchComparison(code), true, code);
	}
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
