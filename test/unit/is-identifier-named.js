import test from 'node:test';
import * as espree from 'espree';
import {isIdentifierNamed} from '../../rules/ast/index.js';

const parseExpression = code => espree.parse(code, {ecmaVersion: 'latest'}).body[0].expression;

test('checks the identifier name', t => {
	t.assert.strictEqual(isIdentifierNamed(parseExpression('foo'), 'foo'), true);
	t.assert.strictEqual(isIdentifierNamed(parseExpression('foo'), 'bar'), false);
	t.assert.strictEqual(isIdentifierNamed(parseExpression('foo.bar'), 'bar'), false);
	t.assert.strictEqual(isIdentifierNamed(parseExpression('\'foo\''), 'foo'), false);
	t.assert.strictEqual(isIdentifierNamed(parseExpression('this'), 'this'), false);
});

test('accepts a missing node', t => {
	t.assert.strictEqual(isIdentifierNamed(undefined, 'foo'), false);
});
