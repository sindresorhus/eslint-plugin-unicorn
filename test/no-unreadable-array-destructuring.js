import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'const [, foo] = parts;',
		'const [foo] = parts;',
		'const [foo,,bar] = parts;',
		'const [foo,   ,     bar] = parts;',
		'const [foo,] = parts;',
		'const [foo,,] = parts;',
		'const [foo,, bar,, baz] = parts;',
		'[,foo] = bar;',
		'({parts: [,foo]} = bar);',
		'function foo([, bar]) {}',
		'function foo([bar]) {}',
		'function foo([bar,,baz]) {}',
		'function foo([bar,   ,     baz]) {}',
		'function foo([bar,]) {}',
		'function foo([bar,,]) {}',
		'function foo([bar,, baz,, qux]) {}',
		'const [, ...rest] = parts;',
		'[value] = array;',
		'[value = object.property] = array;',
		{
			code: 'const [,, foo] = parts;',
			options: [{maximumIgnoredElements: 2}],
		},
		{
			code: 'const [,,, foo] = parts;',
			options: [{maximumIgnoredElements: 3}],
		},
		{
			code: 'const [foo,, bar] = parts;',
			options: [{maximumIgnoredElements: 1}],
		},
		{
			code: 'const [,,,] = parts;',
			options: [{maximumIgnoredElements: 3}],
		},
	],
	invalid: [
		'const [,, foo] = parts;',
		'const [foo,,, bar] = parts;',
		'const [foo,,,] = parts;',
		'const [foo, bar,, baz ,,, qux] = parts;',
		'[,, foo] = bar;',
		'({parts: [,, foo]} = bar);',
		'function foo([,, bar]) {}',
		'function foo([bar,,, baz]) {}',
		'function foo([bar,,,]) {}',
		'function foo([bar, baz,, qux ,,, quux]) {}',
		'const [,,...rest] = parts;',
		'const [,,] = parts;',
		'const [,,,] = parts;',
		// Should add parentheses to array
		'const [,,...rest] = new Array;',
		'const [,,...rest] = (0, foo);',
		'let [,,thirdElement] = new Array;',
		'var [,,thirdElement] = (((0, foo)));',
		// Variable is not `Identifier`
		'let [,,[,,thirdElementInThirdElement]] = foo',
		'let [,,{propertyOfThirdElement}] = foo',
		// Multiple declarations
		'let [,,thirdElement] = foo, anotherVariable = bar;',
		// Default value
		'let [,,thirdElement = {}] = foo;',
		'for (const [, , id] of shuffle(list)) {}',
		'[this.property] = array;',
		'[object.property] = array;',
		'[object.property = defaultValue] = array;',
		'[(condition ? first : second).property] = array;',
		'[this.property.value] = array;',
		'[...object.property] = array;',
		{
			code: '[object.property!] = array;',
			languageOptions: {parser: parsers.typescript},
		},
		'for ([this.property] of arrays) {}',
		'({parts: [this.property]} = object);',
		// Space after keyword
		'let[,,thirdElement] = foo;',
		'let[,,...thirdElement] = foo;',
		'const[,,thirdElement] = foo;',
		'const[,,...thirdElement] = foo;',
		'var[,,thirdElement] = foo;',
		'var[,,...thirdElement] = foo;',
		'let[]=[],[,,thirdElement] = foo;',
		{
			code: 'const [, foo] = parts;',
			options: [{maximumIgnoredElements: 0}],
		},
		{
			code: 'const [,] = parts;',
			options: [{maximumIgnoredElements: 0}],
		},
		{
			code: 'const [foo,, bar] = parts;',
			options: [{maximumIgnoredElements: 0}],
		},
		{
			code: 'const [,,,] = parts;',
			options: [{maximumIgnoredElements: 2}],
		},
		{
			code: 'const [,,, foo] = parts;',
			options: [{maximumIgnoredElements: 2}],
		},
		{
			code: 'const [,,,, foo] = parts;',
			options: [{maximumIgnoredElements: 3}],
		},
		{
			code: 'const [,,, ...rest] = parts;',
			options: [{maximumIgnoredElements: 2}],
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		// The pattern is replaced by the variable alone, so a comment and a type annotation would be lost
		...[
			'const [, , foo]: [string, string, number] = array;',
			'const [, , foo]: Array<string> = array;',
			'let [, , foo]: string[] = array;',
			'const [, , foo] = array;',
		].map(code => ({code, languageOptions: {parser: parsers.typescript}})),
		'const [,/* keep */, foo] = parts;',
		// Destructuring reads through the iterator protocol, `[…]` and `.slice(…)` read by index, so the rewrite is withheld when the initializer is known not to be indexable
		'const [, , third] = new Set([1, 2, 3]);',
		'const [, , third] = new Map([[1, 1]]);',
		'const [, , ...rest] = "abc";',
		'const [, , third] = "abc";',
		'const [, , third] = `abc`;',
		'const [, , third] = new WeakSet();',
		'const [, , third] = function () {};',
		// These are indexable
		'const [, , third] = [1, 2, 3];',
		'const [, , third] = new Array(3);',
		'const [, , third] = new Uint8Array(3);',
		'const [, , third] = new Float64Array(3);',
		'const [, , third] = getArray();',
		'const [, , third] = document.querySelectorAll(\'a\');',
	],
});
