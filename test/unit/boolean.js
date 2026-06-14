import {Linter} from 'eslint';
import test from 'ava';
import {isBooleanExpression, isControlFlowTest, getBooleanAncestor} from '../../rules/utils/boolean.js';

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
		t.true(isBooleanExpression(node, context));
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
		t.false(isBooleanExpression(node, context));
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
		t.true(isControlFlowTest(node));
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
		t.false(isControlFlowTest(node));
	}
});

test('`getBooleanAncestor` returns the boolean coercion ancestor', t => {
	const {node: negatedNode, context: negatedContext} = findFirstMemberExpression('const value = !!!foo.length;');
	const negatedResult = getBooleanAncestor(negatedNode, negatedContext);
	t.is(negatedResult.node.type, 'UnaryExpression');
	t.true(negatedResult.isNegative);

	const {node: booleanCallNode, context: booleanCallContext} = findFirstMemberExpression('const value = Boolean(Boolean(foo.length));');
	const booleanCallResult = getBooleanAncestor(booleanCallNode, booleanCallContext);
	t.is(booleanCallResult.node.type, 'CallExpression');
	t.false(booleanCallResult.isNegative);

	const {node: mixedNode, context: mixedContext} = findFirstMemberExpression('const value = !Boolean(foo.length);');
	const mixedResult = getBooleanAncestor(mixedNode, mixedContext);
	t.is(mixedResult.node.type, 'UnaryExpression');
	t.true(mixedResult.isNegative);

	const {node: shadowedNode, context: shadowedContext} = findFirstMemberExpression('const Boolean = value => value; const value = Boolean(foo.length);');
	const shadowedResult = getBooleanAncestor(shadowedNode, shadowedContext);
	t.is(shadowedResult.node, shadowedNode);
	t.false(shadowedResult.isNegative);
});
