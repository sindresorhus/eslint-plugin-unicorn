import test from 'node:test';
import isEscapedCharacter from '../../rules/utils/is-escaped-character.js';

test('checks for an odd number of preceding backslashes', t => {
	t.assert.strictEqual(isEscapedCharacter('a', 0), false);
	t.assert.strictEqual(isEscapedCharacter('ab', 1), false);
	t.assert.strictEqual(isEscapedCharacter(String.raw`\a`, 1), true);
	t.assert.strictEqual(isEscapedCharacter(String.raw`\\a`, 2), false);
	t.assert.strictEqual(isEscapedCharacter(String.raw`\\\a`, 3), true);
	t.assert.strictEqual(isEscapedCharacter(String.raw`x\\\\a`, 5), false);
	t.assert.strictEqual(isEscapedCharacter(String.raw`\a\b`, 3), true);
});
