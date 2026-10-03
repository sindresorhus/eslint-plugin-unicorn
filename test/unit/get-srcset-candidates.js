import test from 'node:test';
import getSrcsetCandidates from '../../rules/shared/get-srcset-candidates.js';

test('keeps `&` literal when it does not start a known character reference', t => {
	for (const value of [
		'./image&#;.png 1x',
		'./image&#x;.png 1x',
		'./image&unknown;.png 1x',
	]) {
		const url = value.slice(0, -3);
		t.assert.deepStrictEqual(getSrcsetCandidates(value), [{value: url, offsets: [0, url.length]}], value);
	}
});

test('ignores separators at the end', t => {
	t.assert.deepStrictEqual(getSrcsetCandidates('./image.png, '), [{value: './image.png', offsets: [0, 11]}]);
	t.assert.deepStrictEqual(getSrcsetCandidates('./image.png 1x, '), [{value: './image.png', offsets: [0, 11]}]);
});
