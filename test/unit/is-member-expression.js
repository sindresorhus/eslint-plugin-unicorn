import test from 'node:test';
import * as espree from 'espree';
import {isMemberExpression, isMethodCall} from '../../rules/ast/index.js';

const parseExpression = code => espree.parse(code, {ecmaVersion: 'latest'}).body[0].expression;

test('`isMemberExpression` accepts a property name or a list of property names', t => {
	t.assert.strictEqual(isMemberExpression(parseExpression('foo.bar'), 'bar'), true);
	t.assert.strictEqual(isMemberExpression(parseExpression('foo.bar'), 'baz'), false);
	t.assert.strictEqual(isMemberExpression(parseExpression('foo.bar'), ['baz', 'bar']), true);
	t.assert.strictEqual(isMemberExpression(parseExpression('foo.bar'), ['baz']), false);
});

test('`isMemberExpression` with `optional: true` only matches optional member expressions', t => {
	t.assert.strictEqual(isMemberExpression(parseExpression('foo?.bar').expression, {optional: true}), true);
	t.assert.strictEqual(isMemberExpression(parseExpression('foo.bar'), {optional: true}), false);
});

test('`isMethodCall` accepts a method name or a list of method names', t => {
	t.assert.strictEqual(isMethodCall(parseExpression('foo.bar()'), 'bar'), true);
	t.assert.strictEqual(isMethodCall(parseExpression('foo.bar()'), 'baz'), false);
	t.assert.strictEqual(isMethodCall(parseExpression('foo.bar()'), ['baz', 'bar']), true);
	t.assert.strictEqual(isMethodCall(parseExpression('foo.bar()'), ['baz']), false);
});
