import test from 'node:test';
import {isNodeContainsLexicalThis} from '../../rules/utils/index.js';

test('treats node types without visitor keys as having no children', t => {
	const node = {
		type: 'UnknownNode',
		argument: {type: 'ThisExpression'},
	};

	t.assert.strictEqual(isNodeContainsLexicalThis(node, {}), false);
	t.assert.strictEqual(isNodeContainsLexicalThis(node, {UnknownNode: ['argument']}), true);
});
