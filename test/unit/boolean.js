import test from 'node:test';
import {Linter} from 'eslint';
import {
	isBooleanExpression,
	isBooleanContext,
	isControlFlowTest,
	getBooleanAncestor,
} from '../../rules/utils/boolean.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

const linter = new Linter();
const testConfig = {
	languageOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	plugins: {
		test: {
			rules: {
				capture: {
					create: context => ({
						MemberExpression(node) {
							memberExpressionNode ||= node;
							ruleContext ||= context;
						},
					}),
				},
			},
		},
	},
	rules: {
		'test/capture': 'error',
	},
};
let memberExpressionNode;
let ruleContext;

function findFirstMemberExpression(code) {
	memberExpressionNode = undefined;
	ruleContext = undefined;
	linter.verify(code, testConfig);

	if (!memberExpressionNode) {
		throw new Error('Expected to find a MemberExpression node.');
	}

	return {
		node: memberExpressionNode,
		context: ruleContext,
	};
}

test('`isBooleanExpression` returns `true` for boolean-producing expressions', t => {
	for (const code of [
		'const value = !foo.length;',
		'const value = Boolean(foo.length);',
		'const value = Boolean(foo.length || bar);',
		'const value = !Boolean(foo.length);',
	]) {
		const {node, context} = findFirstMemberExpression(code);
		t.assert.strictEqual(isBooleanExpression(node, context), true);
	}
});

test('`isBooleanExpression` returns `false` for control-flow-only contexts', t => {
	for (const code of [
		'if (foo.length) {}',
		'const value = foo.length ? 1 : 2;',
		'while (foo.length) {}',
		'const value = foo.length || bar;',
		'const value = foo.length ?? bar;',
		'const value = foo.length;',
		'const Boolean = value => value; const value = Boolean(foo.length);',
	]) {
		const {node, context} = findFirstMemberExpression(code);
		t.assert.strictEqual(isBooleanExpression(node, context), false);
	}
});

test('`isControlFlowTest` returns `true` for control-flow test contexts', t => {
	for (const code of [
		'if (foo.length) {}',
		'const value = foo.length ? 1 : 2;',
		'while (foo.length) {}',
		'do {} while (foo.length);',
		'for (; foo.length; ) {}',
		'if (foo.length && bar) {}',
	]) {
		const {node} = findFirstMemberExpression(code);
		t.assert.strictEqual(isControlFlowTest(node), true);
	}
});

test('`isControlFlowTest` returns `false` for non-control-flow contexts', t => {
	for (const code of [
		'const value = !foo.length;',
		'const value = Boolean(foo.length);',
		'const value = foo.length || bar;',
		'const value = foo.length;',
	]) {
		const {node} = findFirstMemberExpression(code);
		t.assert.strictEqual(isControlFlowTest(node), false);
	}
});

test('`getBooleanAncestor` returns the boolean coercion ancestor', t => {
	const {node: negatedNode, context: negatedContext} = findFirstMemberExpression('const value = !!!foo.length;');
	const negatedResult = getBooleanAncestor(negatedNode, negatedContext);
	t.assert.strictEqual(negatedResult.node.type, 'UnaryExpression');
	t.assert.strictEqual(negatedResult.isNegative, true);

	const {node: booleanCallNode, context: booleanCallContext} = findFirstMemberExpression('const value = Boolean(Boolean(foo.length));');
	const booleanCallResult = getBooleanAncestor(booleanCallNode, booleanCallContext);
	t.assert.strictEqual(booleanCallResult.node.type, 'CallExpression');
	t.assert.strictEqual(booleanCallResult.isNegative, false);

	const {node: mixedNode, context: mixedContext} = findFirstMemberExpression('const value = !Boolean(foo.length);');
	const mixedResult = getBooleanAncestor(mixedNode, mixedContext);
	t.assert.strictEqual(mixedResult.node.type, 'UnaryExpression');
	t.assert.strictEqual(mixedResult.isNegative, true);

	const {node: shadowedNode, context: shadowedContext} = findFirstMemberExpression('const Boolean = value => value; const value = Boolean(foo.length);');
	const shadowedResult = getBooleanAncestor(shadowedNode, shadowedContext);
	t.assert.strictEqual(shadowedResult.node, shadowedNode);
	t.assert.strictEqual(shadowedResult.isNegative, false);
});

test('`isBooleanContext` returns whether the value is only used for its truthiness', t => {
	const getResult = code => {
		let result;
		linter.verify(code, {
			files: ['**/*.ts'],
			languageOptions: {parser: typescriptEslintParser},
			plugins: {
				test: {
					rules: {
						inspect: {
							create: context => ({
								'Identifier[name="target"]'(node) {
									result = isBooleanContext(node, context);
								},
							}),
						},
					},
				},
			},
			rules: {'test/inspect': 'error'},
		}, 'file.ts');
		return result;
	};

	for (const [code, expected] of [
		['if (target) {}', true],
		['const value = !target;', true],
		['const value = Boolean(target);', true],
		['while (target && other) {}', true],
		['if (target as boolean) {}', false],
		['if ((target satisfies unknown)!) {}', false],
		['const value = !(target as boolean);', false],
		['const value = target;', false],
		['const value = target as boolean;', false],
		['const value = target || other;', false],
		['foo(target);', false],
	]) {
		t.assert.strictEqual(getResult(code), expected, code);
	}
});
