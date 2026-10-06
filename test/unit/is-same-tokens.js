import test from 'node:test';
import isSameTokens from '../../rules/utils/is-same-tokens.js';

test('compares token types and values in order', t => {
	const tokens = [{type: 'Identifier', value: 'foo'}, {type: 'Punctuator', value: '('}, {type: 'Punctuator', value: ')'}];
	t.assert.strictEqual(isSameTokens(tokens, tokens.map(token => ({...token, range: [10, 20]}))), true);
	t.assert.strictEqual(isSameTokens(tokens, tokens.slice(0, -1)), false);
	t.assert.strictEqual(isSameTokens(tokens, tokens.toReversed()), false);
	t.assert.strictEqual(isSameTokens([{type: 'Identifier', value: 'foo'}], [{type: 'Identifier', value: 'bar'}]), false);
	t.assert.strictEqual(isSameTokens([{type: 'Identifier', value: 'foo'}], [{type: 'Keyword', value: 'foo'}]), false);
});

test('empty token arrays are the same', t => {
	t.assert.strictEqual(isSameTokens([], []), true);
	t.assert.strictEqual(isSameTokens([], [{type: 'Punctuator', value: ';'}]), false);
});
