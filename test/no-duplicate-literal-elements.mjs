import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const foo = new Set([1, 2, 3])',
		'const foo = new Set([1, 2, "1"])',
		'const foo = new Set([{}, {}, [], []])',
		outdent`
			const array = [1, 2, 1]
			const foo = new Set(array)
		`,
		'const foo = new Map([["a", 1], ["b", 2]])',
		outdent`
			const obj = { a: 1, a: 2 }
			const map = new Map(Object.entries(obj))
		`,
	],
	invalid: [
		'const foo = new Set([1, 2, 1])',
		'const foo = new Set([1, null, null])',
		'const foo = new Set(["1", "2", "1"])',
		'const foo = new Map([["a", 1], ["a", 2]])',
	],
});
