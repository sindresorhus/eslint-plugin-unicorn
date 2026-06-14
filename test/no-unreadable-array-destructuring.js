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
