import test from 'node:test';
import {parse} from 'espree';
import {hasJavaScriptTypeAnnotations} from '../../rules/utils/index.js';

test('distinguishes type annotations from descriptive comments', t => {
	for (const [code, expected] of [
		['// @ts-check', true],
		['/* @ts-check */', true],
		['/** @ts-check */', true],
		['/**\n * @ts-check\n */', false],
		['/** @param {boolean} value */', true],
		['/** @returns {boolean} */', true],
		['/** @type {Function} */', true],
		['/** @satisfies {Function} */', true],
		['/** @template Value */', true],
		['/** @overload */', true],
		['', false],
		['// @ts-nocheck', false],
		['// @param {boolean} value', false],
		['/* @type {Function} */', false],
		['/** A function that returns a boolean. */', false],
	]) {
		const {comments} = parse(code, {ecmaVersion: 'latest', comment: true});
		const context = {sourceCode: {getAllComments: () => comments}};
		t.assert.strictEqual(hasJavaScriptTypeAnnotations(context), expected, code);
	}
});
