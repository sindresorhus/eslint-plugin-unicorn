import {parse} from 'espree';
import test from 'ava';
import {isBooleanExpression, isControlFlowTest, getBooleanAncestor} from '../../rules/utils/boolean.js';

function parseJavaScript(code) {
	const ast = parse(code, {
		ecmaVersion: 'latest',
		sourceType: 'module',
	});
	setParent(ast);
	return ast;
}

function setParent(node, parent) {
	if (!node || typeof node !== 'object') {
		return;
	}

	if (typeof node.type === 'string') {
		node.parent = parent;
	}

	for (const [key, value] of Object.entries(node)) {
		if (key === 'parent') {
			continue;
		}

		if (Array.isArray(value)) {
			for (const child of value) {
				setParent(child, node);
			}
		} else {
			setParent(value, node);
		}
	}
}

function findNode(node, predicate) {
	if (!node || typeof node !== 'object') {
		return;
	}

	if (typeof node.type === 'string' && predicate(node)) {
		return node;
	}

	for (const [key, value] of Object.entries(node)) {
		if (key === 'parent') {
			continue;
		}

		if (Array.isArray(value)) {
			for (const child of value) {
				const result = findNode(child, predicate);
				if (result) {
					return result;
				}
			}
		} else {
			const result = findNode(value, predicate);
			if (result) {
				return result;
			}
		}
	}
}

function findFirstMemberExpression(code) {
	const ast = parseJavaScript(code);
	return findNode(ast, node => node.type === 'MemberExpression');
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
