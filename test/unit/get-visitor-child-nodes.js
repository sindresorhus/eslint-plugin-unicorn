import test from 'node:test';
import * as espree from 'espree';
import {getVisitorChildNodes} from '../../rules/utils/index.js';

test('yields the direct child nodes in visitor-key order', t => {
	const node = espree.parse('foo(bar, baz);', {ecmaVersion: 'latest'}).body[0].expression;

	t.assert.deepStrictEqual(
		[...getVisitorChildNodes(node, espree.VisitorKeys)].map(child => child.name),
		['foo', 'bar', 'baz'],
	);
});

test('skips `null` and array holes', t => {
	const node = espree.parse('[, foo, , bar]; for (;;) {}', {ecmaVersion: 'latest'});
	const [arrayStatement, forStatement] = node.body;

	t.assert.deepStrictEqual(
		[...getVisitorChildNodes(arrayStatement.expression, espree.VisitorKeys)].map(child => child.name),
		['foo', 'bar'],
	);
	t.assert.deepStrictEqual(
		[...getVisitorChildNodes(forStatement, espree.VisitorKeys)].map(child => child.type),
		['BlockStatement'],
	);
});

test('treats node types without visitor keys as having no children', t => {
	const node = {
		type: 'UnknownNode',
		argument: {type: 'Identifier', name: 'foo'},
	};

	t.assert.deepStrictEqual([...getVisitorChildNodes(node, {})], []);
	t.assert.deepStrictEqual([...getVisitorChildNodes(node, {UnknownNode: ['argument']})], [node.argument]);
});
