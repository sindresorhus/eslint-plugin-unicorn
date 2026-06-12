import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Array.from(iterable, mapFunction);',
		'Array.from(iterable, mapFunction).map(nextMapFunction);',
		'Array.from(iterable).filter(filterFunction);',
		'const Array = {from() {}}; Array.from(iterable).map(element => element);',
		'NotArray.from(iterable).map(mapFunction);',
		'Array[from](iterable).map(mapFunction);',
		'Array.from?.(iterable).map(mapFunction);',
		'Array?.from(iterable).map(mapFunction);',
		'Array.from(iterable)?.map(mapFunction);',
		'Array.from(iterable).map?.(mapFunction);',
		'Array.from(iterable).map(...argumentsArray);',
		'Array.from(iterable).map(mapFunction, thisArgument, extraArgument);',
		'Array.from(...iterable).map(mapFunction);',
		'Array.from(iterable, existingMapFunction).map(nextMapFunction);',
		'Array.from(iterable).map(mapFunction);',
		'Array.from(iterable).map(mapFunction, thisArgument);',
		'const mapFunction = (element, index, array) => array.includes(element); Array.from(iterable).map(mapFunction);',
		'Array.from(iterable).map(function (element) { return element.id; });',
		'Array.from(iterable).map(function (element, index) { return this.format(element, index); }, formatter);',
		'Array.from(iterable).map(function () { return arguments[2]; });',
		'Array.from(iterable).map((element, index, array) => element);',
		'Array.from(iterable).map((element, ...rest) => element);',
		'Array.from(iterable).map(function (element, index, array) { return element; });',
		'Array.from(iterable).map(function (element, ...rest) { return element; });',
		'Array.from(iterable).map(element => [element]).flat();',
		'Array.from(iterable).map(element => [element]).flat(1);',
	],
	invalid: [
		'Array.from(iterable).map(element => element.id);',
		'Array.from(iterable).map((element, index) => element + index);',
		'Array.from(iterable).map(element => element).filter(Boolean);',
		'Array.from(iterable,).map(element => element);',
		'(Array.from(iterable)).map(element => element);',
		'Array.from(iterable).map((element => element));',
		'Array.from(iterable).map((element => element), thisArgument);',
		'Array.from(/* source */ iterable).map(element => element);',
		'Array.from(iterable).map(/* callback */ element => element);',
		'Array.from(iterable) /* comment */ .map(element => element);',
		'Array.from(iterable).map(element => element /* comment */);',
		'Array.from(iterable).map(element => element, /* this */ thisArgument);',
		'Array.from(iterable).map(element => element /* comment */,);',
		'Array.from(iterable).map(element => element).flat(2);',
		outdent`
			const result = Array.from(iterable)
				.map(element => {
					return element.id;
				});
		`,
		{
			code: 'Array.from(iterable).map((element: string) => element);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		{
			code: 'Array.from(iterable).map((element: string, index: number): string => element + index);',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
});
