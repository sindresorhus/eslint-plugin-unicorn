/* eslint-disable no-template-curly-in-string */
import test from 'node:test';
import {parse} from 'espree';
import {isSameReference} from '../../rules/utils/index.js';

test('compares static strings by their decoded value', t => {
	for (const [left, right, expected] of [
		['"name"', '`name`', true],
		['`name`', '"name"', true],
		['`name`', '`name`', true],
		['""', '``', true],
		['"name"', '`na\\u{6d}e`', true],
		['"abc".length', '`ab\\u0063`.length', true],
		['"".length', '``.length', true],
		['"first".length', '`second`.length', false],
		['`first`', '`second`', false],
		['"name"', 'tag`name`', false],
		['"name"', '`na${value}e`', false],
		['1', '`1`', false],
		['identifier', '`identifier`', false],
	]) {
		const leftNode = parse(left, {ecmaVersion: 'latest'}).body[0].expression;
		const rightNode = parse(right, {ecmaVersion: 'latest'}).body[0].expression;
		t.assert.strictEqual(isSameReference(leftNode, rightNode), expected, `${left} / ${right}`);
	}
});
