import test from 'node:test';
import {shouldAddParenthesesToUnaryExpressionArgument} from '../../rules/utils/index.js';

test('throws for operators that are not prefix unary operators', t => {
	const node = {type: 'Identifier', name: 'value'};

	t.assert.strictEqual(shouldAddParenthesesToUnaryExpressionArgument(node, '!'), false);
	t.assert.throws(() => shouldAddParenthesesToUnaryExpressionArgument(node, '++'), {message: 'Unexpected operator'});
});
