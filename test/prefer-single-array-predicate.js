import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'array.some(element => element.foo) && array.some(element => element.bar);',
		'array.every(element => element.foo) || array.every(element => element.bar);',
		'array.some(element => element.foo) || other || array.some(element => element.bar);',
		'array.some(element => element.foo) || otherArray.some(element => element.bar);',
		'array.some(element => element.foo) || array.some(value => value.bar);',
		'array.some((element, index) => element.foo || index > 0) || array.some(element => element.bar);',
		'array.some(element => element.foo) || array.some(element => element.bar, thisArgument);',
		'array?.some(element => element.foo) || array?.some(element => element.bar);',
		'array.some?.(element => element.foo) || array.some?.(element => element.bar);',
		'const collection = {}; collection.some(element => element.foo) || collection.some(element => element.bar);',
		'array.some(element => element.foo) /* comment */ || array.some(element => element.bar);',
		{
			code: 'function foo(array: string[]) { array.some(element => element.length > 1) && array.some(element => element.length < 10); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: string[]) { array.some((element): element is string => element.length > 1) || array.some((element): element is string => element.length < 10); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo<T>(array: T[]) { array.some(<Value>(element: Value) => Boolean(element)) || array.some(<Value>(element: Value) => element === undefined); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: string[]) { array.some((element: string) => element.length > 1) || array.some((element: number) => element.toFixed()); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: string[]) { array.some<string>(element => element.length > 1) || array.some<string>(element => element.length < 10); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
	invalid: [
		outdent`
			if (
				array.some(element => element.foo === 1)
				|| array.some(element => element.bar === 2)
			) {}
		`,
		outdent`
			if (
				array.every(element => element.foo === 1)
				&& array.every(element => element.bar === 2)
			) {}
		`,
		'array.some(element => element.foo) || array.some(element => element.bar) || array.some(element => element.baz);',
		'array.some(element => (element.foo)) || array.some(element => (element.bar));',
		'array.every(element => element.foo || element.bar) && array.every(element => element.baz);',
		'array.some(element => element.foo && element.bar) || array.some(element => element.baz);',
		'this.items.some(element => element.foo) || this.items.some(element => element.bar);',
		{
			code: 'function foo(array: string[]) { array.some(element => element.length > 1) || array.some(element => element.length < 10); }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(array: string[]) { array.some((element: string) => element.length > 1) || array.some((element: string) => element.length < 10); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});
