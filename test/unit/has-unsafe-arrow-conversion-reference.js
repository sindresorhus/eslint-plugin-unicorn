import test from 'node:test';
import * as espree from 'espree';
import {hasUnsafeArrowConversionReference} from '../../rules/utils/index.js';

test('a node type without visitor keys has no unsafe reference', t => {
	const node = espree.parse('foo(this);', {ecmaVersion: 'latest'}).body[0].expression;

	t.assert.strictEqual(hasUnsafeArrowConversionReference(node, espree.VisitorKeys), true);
	t.assert.strictEqual(hasUnsafeArrowConversionReference(node, {}), false);
});
