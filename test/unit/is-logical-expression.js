import test from 'node:test';
import {Linter} from 'eslint';
import {
	getLogicalExpressionOperands,
	getLogicalExpressionRoot,
	isOutermostLogicalExpression,
} from '../../rules/utils/index.js';

/*
Run `getResult` on each node matching `selector` in `code`.
*/
const getResults = (code, selector, getResult) => {
	const results = [];
	const linter = new Linter();
	linter.verify(code, {
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							[selector](node) {
								results.push(getResult(node, context));
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

const getTexts = (nodes, context) => nodes.map(node => context.sourceCode.getText(node));

test('`getLogicalExpressionOperands` flattens operands with the same operator', t => {
	const getOperands = (code, operator) => getResults(code, 'Program > ExpressionStatement > .expression', (node, context) => getTexts(getLogicalExpressionOperands(node, operator), context))[0];

	t.assert.deepStrictEqual(getOperands('a && b && c;', '&&'), ['a', 'b', 'c']);
	t.assert.deepStrictEqual(getOperands('a && (b && c);', '&&'), ['a', 'b', 'c']);
	t.assert.deepStrictEqual(getOperands('a && (b || c) && d;', '&&'), ['a', 'b || c', 'd']);
	t.assert.deepStrictEqual(getOperands('a || b && c;', '||'), ['a', 'b && c']);
	t.assert.deepStrictEqual(getOperands('a ?? b ?? c;', '??'), ['a', 'b', 'c']);
	t.assert.deepStrictEqual(getOperands('a || b;', '&&'), ['a || b']);
	t.assert.deepStrictEqual(getOperands('a;', '&&'), ['a']);
});

test('`getLogicalExpressionRoot` returns the outermost logical expression with the operator', t => {
	const getRoot = (code, operator) => getResults(code, 'Identifier[name="target"]', (node, context) => context.sourceCode.getText(getLogicalExpressionRoot(node, operator)))[0];

	t.assert.strictEqual(getRoot('a && target && b;', '&&'), 'a && target && b');
	t.assert.strictEqual(getRoot('a || (target && b);', '&&'), 'target && b');
	t.assert.strictEqual(getRoot('a || (target && b);', '||'), 'target');
	t.assert.strictEqual(getRoot('foo(target);', '&&'), 'target');
});

test('`isOutermostLogicalExpression` checks the parent operator', t => {
	const getResult = code => getResults(code, 'LogicalExpression', (node, context) => [context.sourceCode.getText(node), isOutermostLogicalExpression(node)]);

	t.assert.deepStrictEqual(getResult('a && b && c;'), [['a && b && c', true], ['a && b', false]]);
	t.assert.deepStrictEqual(getResult('a || (b && c);'), [['a || (b && c)', true], ['b && c', true]]);
});
