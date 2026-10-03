import test from 'node:test';
import * as espree from 'espree';
import {isNodeMatchesNameOrPath} from '../../rules/utils/is-node-matches.js';

const parseExpression = code => espree.parse(code, {ecmaVersion: 'latest', sourceType: 'module'}).body[0].expression;

test('matches a name or a key path', t => {
	t.assert.strictEqual(isNodeMatchesNameOrPath(parseExpression('foo'), 'foo'), true);
	t.assert.strictEqual(isNodeMatchesNameOrPath(parseExpression('foo'), ' foo '), true);
	t.assert.strictEqual(isNodeMatchesNameOrPath(parseExpression('foo.bar.baz'), 'foo.bar.baz'), true);
	t.assert.strictEqual(isNodeMatchesNameOrPath(parseExpression('this.foo'), 'this.foo'), true);
	t.assert.strictEqual(isNodeMatchesNameOrPath(parseExpression('import.meta'), 'import.meta'), true);
	t.assert.strictEqual(isNodeMatchesNameOrPath(parseExpression('foo.bar'), 'foo.baz'), false);
	t.assert.strictEqual(isNodeMatchesNameOrPath(parseExpression('foo.bar'), 'bar'), false);
	t.assert.strictEqual(isNodeMatchesNameOrPath(parseExpression('foo.bar'), 'foo.'), false);
	t.assert.strictEqual(isNodeMatchesNameOrPath(parseExpression('foo'), '.foo'), false);
	t.assert.strictEqual(isNodeMatchesNameOrPath(parseExpression('foo'), 'this'), false);
});
