import test from 'node:test';
import {containsSuspensionPoint} from '../../rules/utils/index.js';

test('treats node types without visitor keys as having no children', t => {
	const node = {
		type: 'UnknownNode',
		argument: {type: 'AwaitExpression'},
	};

	t.assert.strictEqual(containsSuspensionPoint(node, {}), false);
	t.assert.strictEqual(containsSuspensionPoint(node, {UnknownNode: ['argument']}), true);
});
