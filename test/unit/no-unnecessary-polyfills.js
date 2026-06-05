import test from 'ava';
import {getBestMatchingPolyfill} from '../../rules/no-unnecessary-polyfills.js';

test('getBestMatchingPolyfill prefers the least specific match for constructor polyfills', t => {
	const polyfillCandidates = [
		{
			feature: 'es.symbol.description',
			pattern: /^es6-symbol$/v,
		},
		{
			feature: 'es.symbol',
			pattern: /^es6-symbol$/v,
		},
		{
			feature: 'es.symbol.async-dispose',
			pattern: /^es6-symbol$/v,
		},
	];

	const polyfill = getBestMatchingPolyfill(polyfillCandidates, 'es6-symbol');

	t.is(polyfill?.feature, 'es.symbol');
});

test('getBestMatchingPolyfill keeps method-specific matches', t => {
	const polyfillCandidates = [
		{
			feature: 'es.promise.finally',
			pattern: /^p-finally$/v,
		},
		{
			feature: 'es.promise',
			pattern: /^promise-polyfill$/v,
		},
	];

	const polyfill = getBestMatchingPolyfill(polyfillCandidates, 'p-finally');

	t.is(polyfill?.feature, 'es.promise.finally');
});
