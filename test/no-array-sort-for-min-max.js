import {outdent} from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const minimum = Math.min(...array);',
		'const minimum = array.reduce((minimum, value) => Math.min(minimum, value));',
		'const minimum = array.sort()[0];',
		'const minimum = array.toSorted()[0];',
		'const first = array.sort((a, b) => a.localeCompare(b))[0];',
		'const first = array.sort(compare)[0];',
		'const first = array.sort((a, b) => a - b || a.id - b.id)[0];',
		'const first = array.sort((a, b) => a.value - b.value)[0];',
		'const first = array.sort((a, b) => a - b)[1];',
		'const first = array.sort((a, b) => a - b).at(1);',
		'const first = array.sort((a, b) => a - b).at(index);',
		'const first = array.sort?.((a, b) => a - b)[0];',
		'const first = array?.sort((a, b) => a - b)[0];',
		'const first = array["sort"]((a, b) => a - b)[0];',
		'const first = array.sort((a, b) => { return a - b; return 0; })[0];',
		'const first = array.sort((a, b) => {})[0];',
		'const first = array.sort(async (a, b) => a - b)[0];',
		'const first = array.sort(function * (a, b) { return a - b; })[0];',
		'const first = ({sort() {}}).sort((a, b) => a - b)[0];',
		'const first = new Set().sort((a, b) => a - b)[0];',
		'array.sort((a, b) => a - b)[0] = value;',
		'array.sort((a, b) => a - b)[0]++;',
		'delete array.sort((a, b) => a - b)[0];',
		{
			code: 'const first = array.sort((a: number, b: number) => a - b).at(1);',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		'const minimum = array.sort((a, b) => a - b)[0];',
		'const minimum = array.toSorted((a, b) => a - b)[0];',
		'const minimum = array.sort((a, b) => a - b).at(0);',
		'const minimum = array.toSorted((a, b) => a - b).at(0);',
		'const maximum = array.sort((a, b) => a - b).at(-1);',
		'const maximum = array.toSorted((a, b) => a - b).at(-1);',
		'const maximum = array.sort((a, b) => b - a)[0];',
		'const maximum = array.toSorted((a, b) => b - a)[0];',
		'const minimum = array.sort((a, b) => b - a).at(-1);',
		'const minimum = array.toSorted((a, b) => b - a).at(-1);',
		outdent`
			const minimum = array.sort(function (a, b) {
				return a - b;
			})[0];
		`,
		outdent`
			const maximum = array.toSorted((a, b) => {
				return a - b;
			}).at(-1);
		`,
		'const minimum = (array ?? fallback).toSorted((a, b) => a - b)[0];',
		outdent`
			const minimum = array.toSorted((a, b) => {
				// Compare numerically.
				return a - b;
			})[0];
		`,
		outdent`
			class ArraySubclass extends Array {
				getMinimum() {
					return super.sort((a, b) => a - b)[0];
				}
			}
		`,
		{
			code: 'const minimum = array.sort((a: number, b: number) => a - b)[0];',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
