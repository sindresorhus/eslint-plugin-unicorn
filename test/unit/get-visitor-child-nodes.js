import test from 'node:test';
import * as espree from 'espree';
import {getEvaluatedChildNodes, getVisitorChildNodes} from '../../rules/utils/index.js';

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

test('`getEvaluatedChildNodes` skips non-computed member properties and property keys', t => {
	const program = espree.parse('foo.bar; foo[bar]; ({key: value, [computed]: value}); (class {field = value; method() {}});', {ecmaVersion: 'latest'});
	const [member, computedMember, object, classExpression] = program.body.map(statement => statement.expression);
	const getNames = node => [...getEvaluatedChildNodes(node, espree.VisitorKeys)].map(child => child.name ?? child.type);
	const [property, computedProperty] = object.properties;
	const [field, method] = classExpression.body.body;

	t.assert.deepStrictEqual(getNames(member), ['foo']);
	t.assert.deepStrictEqual(getNames(computedMember), ['foo', 'bar']);
	t.assert.deepStrictEqual(getNames(property), ['value']);
	t.assert.deepStrictEqual(getNames(computedProperty), ['computed', 'value']);
	t.assert.deepStrictEqual(getNames(field), ['value']);
	t.assert.deepStrictEqual(getNames(method), ['FunctionExpression']);
});
