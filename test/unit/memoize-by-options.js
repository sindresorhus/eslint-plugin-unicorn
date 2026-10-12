import test from 'node:test';
import {memoizeByOptions} from '../../rules/utils/index.js';

test('prepares each options object once', t => {
	const preparedOptions = [];
	const getPrepared = memoizeByOptions(options => {
		const prepared = {value: options.value * 2};
		preparedOptions.push(prepared);
		return prepared;
	});

	const first = {value: 1};
	const second = {value: 1};

	t.assert.strictEqual(getPrepared(first), getPrepared(first));
	t.assert.notStrictEqual(getPrepared(second), getPrepared(first));
	t.assert.deepStrictEqual(getPrepared(second), {value: 2});
	t.assert.strictEqual(preparedOptions.length, 2);
});

test('caches a falsy prepared result', t => {
	let callCount = 0;
	const getPrepared = memoizeByOptions(() => {
		callCount++;
		return undefined;
	});

	const options = {};
	getPrepared(options);
	getPrepared(options);

	t.assert.strictEqual(callCount, 1);
});
