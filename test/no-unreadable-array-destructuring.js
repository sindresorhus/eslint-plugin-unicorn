import {test} from './utils/test';

test({
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
		'const [,,] = parts;'
	],
	invalid: []
});

test.visualize([
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
	'const [,,,] = parts;'
]);
