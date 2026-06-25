import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Array.from({length}, (_, index) => index);',
		'Array.from({length: count}, (_, index) => index);',
		'Array.from(Array(length).values());',
		'Array.from(Array(length).entries());',
		'Array.from(Array(length).keys(), index => index);',
		'Array.from(Array(length).keys(), mapFunction);',
		'Array.from(...Array(length).keys());',
		'Array.from?.(Array(length).keys());',
		'Array?.from(Array(length).keys());',
		'NotArray.from(Array(length).keys());',
		'Array.from(array.keys());',
		'Array.from(new Set([1, 2]).keys());',
		'[...Array(length).values()];',
		'[...Array(length).entries()];',
		'[...Array(length).keys(), other];',
		'[other, ...Array(length).keys()];',
		'[...Array[length].keys()];',
		'[...Array(length)[\'keys\']()];',
		'Array[\'from\'](Array(length).keys());',
		'Array.from(Array(length)[\'keys\']());',
		'[...Array(length).keys?.()];',
		'[...Array(length)?.keys()];',
		'[...Array?.(length).keys()];',
		'[...Array(...length).keys()];',
		'[...Array(length, other).keys()];',
		'[...NotArray(length).keys()];',
		'[...new Array(length, other).keys()];',
		'[...new Array(...length).keys()];',
		'[...Array("3").keys()];',
		'[...Array(3.5).keys()];',
		'[...Array(-1).keys()];',
		'[...Array(2 ** 32).keys()];',
		'for (const index of Array(length).keys()) {}',
		'const Array = value; [...Array(length).keys()];',
		'function foo(Array) { return [...Array(length).keys()]; }',
		{
			code: '[...NotArray<number>(length).keys()];',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
	invalid: [
		'[...Array(length).keys()];',
		'[...new Array(length).keys()];',
		'Array.from(Array(length).keys());',
		'Array.from(new Array(length).keys());',
		'Array.from(Array(length).keys(),);',
		'[...Array(count + 1).keys()];',
		'Array.from(Array(count + 1).keys());',
		'[...Array((count + 1)).keys()];',
		'[...Array((count, fallback)).keys()];',
		'Array.from((Array(length).keys()));',
		'[...(Array(length).keys())];',
		outdent`
			[
				...Array(
					length
				).keys()
			];
		`,
		outdent`
			Array.from(
				Array(
					length
				).keys()
			);
		`,
		'[...Array(/* keep */ length).keys()];',
		'[.../* keep */Array(length).keys()];',
		'[...Array(length)/* keep */.keys()];',
		'[...Array(length).keys(/* keep */)];',
		'Array.from(/* keep */ Array(length).keys());',
		{
			code: '[...Array<number>(length).keys()];',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: '[...new Array<number>(length).keys()];',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: '[...Array(length as number).keys()];',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: '[...(Array(length) as number[]).keys()];',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: '[...(Array(length)!).keys()];',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: '[...(Array(length) satisfies number[]).keys()];',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'Array.from((Array(length) as number[]).keys());',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});
