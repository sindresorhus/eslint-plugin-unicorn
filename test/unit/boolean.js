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
					create() {
						return {
							MemberExpression(node) {
								memberExpressionNode ||= node;
							},
						};
					},
				},
			},
		},
	},
	rules: {
		'test/capture': 'error',
	},
};
let memberExpressionNode;

function findFirstMemberExpression(code) {
	memberExpressionNode = undefined;
	linter.verify(code, testConfig);

	if (!memberExpressionNode) {
		throw new Error('Expected to find a MemberExpression node.');
	}

	return memberExpressionNode;
}

test('`isBooleanExpression` returns `true` for boolean-producing expressions', t => {
	t.true(isBooleanExpression(findFirstMemberExpression('const value = !foo.length;')));
	t.true(isBooleanExpression(findFirstMemberExpression('const value = Boolean(foo.length);')));
	t.true(isBooleanExpression(findFirstMemberExpression('const value = Boolean(foo.length || bar);')));
	t.true(isBooleanExpression(findFirstMemberExpression('const value = !Boolean(foo.length);')));
});

test('`isBooleanExpression` returns `false` for control-flow-only contexts', t => {
	t.false(isBooleanExpression(findFirstMemberExpression('if (foo.length) {}')));
	t.false(isBooleanExpression(findFirstMemberExpression('const value = foo.length ? 1 : 2;')));
	t.false(isBooleanExpression(findFirstMemberExpression('while (foo.length) {}')));
	t.false(isBooleanExpression(findFirstMemberExpression('const value = foo.length || bar;')));
	t.false(isBooleanExpression(findFirstMemberExpression('const value = foo.length ?? bar;')));
	t.false(isBooleanExpression(findFirstMemberExpression('const value = foo.length;')));
});

test('`isControlFlowTest` returns `true` for control-flow test contexts', t => {
	t.true(isControlFlowTest(findFirstMemberExpression('if (foo.length) {}')));
	t.true(isControlFlowTest(findFirstMemberExpression('const value = foo.length ? 1 : 2;')));
	t.true(isControlFlowTest(findFirstMemberExpression('while (foo.length) {}')));
	t.true(isControlFlowTest(findFirstMemberExpression('do {} while (foo.length);')));
	t.true(isControlFlowTest(findFirstMemberExpression('for (; foo.length; ) {}')));
	t.true(isControlFlowTest(findFirstMemberExpression('if (foo.length && bar) {}')));
});

test('`isControlFlowTest` returns `false` for non-control-flow contexts', t => {
	t.false(isControlFlowTest(findFirstMemberExpression('const value = !foo.length;')));
	t.false(isControlFlowTest(findFirstMemberExpression('const value = Boolean(foo.length);')));
	t.false(isControlFlowTest(findFirstMemberExpression('const value = foo.length || bar;')));
	t.false(isControlFlowTest(findFirstMemberExpression('const value = foo.length;')));
});

test('`getBooleanAncestor` returns the boolean coercion ancestor', t => {
	const negatedNode = findFirstMemberExpression('const value = !!!foo.length;');
	const negatedResult = getBooleanAncestor(negatedNode);
	t.is(negatedResult.node.type, 'UnaryExpression');
	t.true(negatedResult.isNegative);

	const booleanCallNode = findFirstMemberExpression('const value = Boolean(Boolean(foo.length));');
	const booleanCallResult = getBooleanAncestor(booleanCallNode);
	t.is(booleanCallResult.node.type, 'CallExpression');
	t.false(booleanCallResult.isNegative);

	const mixedNode = findFirstMemberExpression('const value = !Boolean(foo.length);');
	const mixedResult = getBooleanAncestor(mixedNode);
	t.is(mixedResult.node.type, 'UnaryExpression');
	t.true(mixedResult.isNegative);
});
