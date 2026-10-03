import test from 'node:test';
import {shouldAddParenthesesToLogicalExpressionChild} from '../../rules/utils/index.js';

test('requires the `property` option', t => {
	const node = {type: 'Identifier', name: 'value'};

	t.assert.strictEqual(shouldAddParenthesesToLogicalExpressionChild(node, {operator: '&&', property: 'left'}), false);
	t.assert.throws(() => shouldAddParenthesesToLogicalExpressionChild(node, {operator: '&&'}), {message: '`property` is required.'});
});
