import test from 'node:test';
import * as espree from 'espree';
import {isArrayPrototypeProperty} from '../../rules/utils/array-or-object-prototype-property.js';

const parseExpression = code => espree.parse(code, {ecmaVersion: 'latest'}).body[0].expression;

test('`isArrayPrototypeProperty` does not match an empty object', t => {
	t.assert.strictEqual(isArrayPrototypeProperty(parseExpression('({}).map'), {property: 'map'}), false);
	t.assert.strictEqual(isArrayPrototypeProperty(parseExpression('[].map'), {property: 'map'}), true);
});
