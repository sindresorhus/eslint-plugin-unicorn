import {getTester} from './utils/test.mjs';

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
		// This is stupid, but valid code
		'const [,,] = parts;',
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
		// This is stupid, but valid code
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
		// Space after keyword
		'let[,,thirdElement] = foo;',
		'let[,,...thirdElement] = foo;',
		'const[,,thirdElement] = foo;',
		'const[,,...thirdElement] = foo;',
		'var[,,thirdElement] = foo;',
		'var[,,...thirdElement] = foo;',
		'let[]=[],[,,thirdElement] = foo;',
	],
});
