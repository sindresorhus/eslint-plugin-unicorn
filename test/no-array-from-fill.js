import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Array.from({length: 3})',
		'Array.from({length: 3}, (_, index) => index)',
		'Array.from({length: 3}).map((_, index) => index)',
		'Array.from(items).fill(0)',
		'Array.from({length: 3, 0: "value"}).fill(0)',
		'Array.from({...length}).fill(0)',
		'Array.from({["length"]: 3}).fill(0)',
		'Array.from({length: 3}).fill(0, 1)',
		'Array.from({length: 3}).fill(0, 1, 2)',
		'Array.from({length: 3}).fill(...value)',
		'Array.from?.({length: 3}).fill(0)',
		'Array.from({length: 3})?.fill(0)',
		'Array.from({length: 3}).fill?.(0)',
		'NotArray.from({length: 3}).fill(0)',
		'Array.notFrom({length: 3}).fill(0)',
		'Array.from({length: 3}).slice().fill(0)',
		'const Array = {from() { return {fill() { return {map() {}}; }}; }}; Array.from({length: 3}).fill().map((_, index) => index)',
		'function unicorn(Array) { return Array.from({length: 3}).fill(0); }',
	],
	invalid: [
		'Array.from({length: 3}).fill(0)',
		'Array.from({length: 3}).fill()',
		'Array.from({length}).fill(null)',
		'Array.from({"length": 3}).fill(0)',
		'Array.from({length: 3}).fill({})',
		'Array.from({length: 3}).fill(0).map((_, index) => index)',
		'Array.from({length: 3}).fill().map((value, index) => index)',
		'Array.from({length: 3}).fill(0).flatMap((_, index) => [index])',
		'Array.from({length: 3}).fill().flatMap(value => [value])',
		'Array.from({length: 3}).fill(0).filter(Boolean)',
		outdent`
			Array.from({length: 3})
				.fill(0)
				.map((_, index) => index);
		`,
		outdent`
			Array.from(
				{length: 3}
			)
				.fill(0)
				.map((_, index) => index);
		`,
	],
});
