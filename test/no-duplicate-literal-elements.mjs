import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const array = [1, 2, 3]',
		'const array = [1, "1"]',
		'[1, 2, 3]',
		'const set = new Set([1, 2, 3])',
		'const set = new Set([1, 2, "1"])',
		'const set = new Set([{}, {}, [], []])',
		'const set = new Set([1, "1"])',
		'const map = new Map([["a", 1], ["b", 2]])',
		'const map = new Map([["a", 1], ["b", 2]])',
		'const map = new Map([])',
		'const map = new Map([[], []])',
		outdent`
			let array
			array = [1, 2, 3]
		`,
		outdent`
			const array = [1, 2]
			array.push(1)
			const set = new Set(array)
		`,
		outdent`
			const obj = { a: 1, a: 2 }
			const map = new Map(Object.entries(obj))
		`,
		outdent`
			const array = [[1, 1], [2, 2], [1, 1]]
			const map = new Map(Object.entries(obj))
		`,
	],
	invalid: [
		'const array = [1, 2, 1]',
		'const array = [false, true, false]',
		'const array = ["a", "b", "a"]',
		'const array = ["a", "b", "a", 1, 2, 3, 1]',
		'[1, 2, 1]',
		'[false, true, false]',
		'["a", "b", "a", 1, 2, 3, 1]',
		'[1, null, null]',
		'const set = new Set([1, 2, 1])',
		'new Set([1, 2, 1])',
		'const set = new Set([1, null, null])',
		'const set = new Set(["1", "2", "1"])',
		'const set = new Set([1, "1", "1"])',
		'const set = new Set([false, true, false])',
		'const map = new Map([["a", 1], ["a", 2]])',
		'new Map([[1, 1], [2, 2], [1, 1]])',
		'new Map([[null, 1], [null, 1]])',
		outdent`
			let array
			array = [1, 2, 1]
		`,
	],
});
