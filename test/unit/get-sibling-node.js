import test from 'node:test';
import {getNextNode, getPreviousNode} from '../../rules/utils/index.js';

test('falls back to the parent keys for node types without visitor keys', t => {
	const first = {type: 'Identifier', name: 'first'};
	const second = {type: 'Identifier', name: 'second'};
	const parent = {type: 'UnknownNode', items: [first, second]};
	first.parent = parent;
	second.parent = parent;
	const context = {sourceCode: {visitorKeys: {}}};

	t.assert.strictEqual(getNextNode(first, context), second);
	t.assert.strictEqual(getPreviousNode(second, context), first);
	t.assert.strictEqual(getPreviousNode(first, context), undefined);
});
