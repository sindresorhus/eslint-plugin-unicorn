import test from 'node:test';
import {getLineStart} from '../../rules/utils/index.js';

test('returns the start of the line containing the index', t => {
	t.assert.strictEqual(getLineStart('foo\nbar', 5), 4);
	t.assert.strictEqual(getLineStart('foo\nbar', 4), 4);
	t.assert.strictEqual(getLineStart('foo\nbar', 3), 0);
	t.assert.strictEqual(getLineStart('foo\nbar', 7), 4);
});

test('returns `0` on the first line', t => {
	t.assert.strictEqual(getLineStart('foo', 2), 0);
	t.assert.strictEqual(getLineStart('foo', 0), 0);
	t.assert.strictEqual(getLineStart('\nfoo', 0), 0);
});

test('recognizes every line ending', t => {
	t.assert.strictEqual(getLineStart('foo\r\nbar', 6), 5);
	t.assert.strictEqual(getLineStart('foo\rbar', 5), 4);
	t.assert.strictEqual(getLineStart('foo\u2028bar', 5), 4);
	t.assert.strictEqual(getLineStart('foo\u2029bar', 5), 4);
});

test('uses the closest line ending of any kind', t => {
	t.assert.strictEqual(getLineStart('a\u2028b\nc\rd', 7), 6);
	t.assert.strictEqual(getLineStart('a\nb\rc\u2028d', 7), 6);
});
