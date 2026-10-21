import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['const [,, {/* keep */ value}] = array;', 'const {/* keep */ value} = array[2];'],
		['const [,, [/* keep */ value]] = array;', 'const [/* keep */ value] = array[2];'],
	].map(([code, output]) => ({code, output, errors: [{messageId: 'ignored-elements'}]})),
});

test({
	valid: [],
	invalid: [
		...[
			['const [,, {value // keep\r\n}] = array;', 'const {value // keep\r\n} = array[2];'],
			['const[,, ...{/* keep */ length}] = array;', 'const {/* keep */ length} = array.slice(2);'],
			['const [,, {nested: {/* keep */ value}}] = (array ?? fallback);', 'const {nested: {/* keep */ value}} = (array ?? fallback)[2];'],
		].map(([code, output]) => ({code, output, errors: [{messageId: 'ignored-elements'}]})),
		{
			code: 'const [,, {/* keep */ value}] = array as Array<{value: number}>;',
			output: 'const {/* keep */ value} = (array as Array<{value: number}>)[2];',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'ignored-elements'}],
		},
		...[
			'const [/* discard */,, {/* keep */ value}] = array;',
			'const [,, .../* discard */{/* keep */ length}] = array;',
			'const [,, {/* keep */ value} /* discard */] = array;',
			'const [,, value = {/* keep */ fallback}] = array;',
			'const [,, ...{/* keep */ length}] = new Uint8Array(4);',
		].map(code => ({code, errors: [{messageId: 'ignored-elements'}]})),
		{
			code: 'const [,, {/* keep */ value}]: Array<{value: number}> = array;',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'ignored-elements'}],
		},
	],
});

nodeTest('comment-preserving destructuring fixes retain bindings and evaluate the source once', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'no-unreadable-array-destructuring': rule}}},
		rules: {'unicorn/no-unreadable-array-destructuring': 'error'},
	};
	for (const [binding, initializer, result] of [
		['{/* keep */ value}', '[0, 1, {value: 3}]', 'value'],
		['[/* keep */ value]', '[0, 1, [3]]', 'value'],
		['...{/* keep */ length}', '[0, 1, 3, 4]', 'length'],
	]) {
		const code = `let calls = 0; const read = () => {calls++; return ${initializer};}; const [,, ${binding}] = read(); JSON.stringify({result: ${result}, calls});`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(output.split('/* keep */').length, 2);
		t.assert.strictEqual(runInNewContext(output), runInNewContext(code));
		t.assert.deepStrictEqual(JSON.parse(runInNewContext(output)), {result: result === 'length' ? 2 : 3, calls: 1});
	}
});

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
		// Object pattern targets are not checked
		'[{property: object.property}] = array;',
		'[{[object.key]: value}] = array;',
		'const foo = {property: object.property};',
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
		// The pattern is replaced by the variable alone, so comments outside the copied binding and a type annotation would be lost
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

// `.slice()` on a typed array returns a typed array, not an `Array`, so the rest element is not fixed
test({
	valid: [],
	invalid: [
		{
			code: 'const [, , ...rest] = new Uint8Array(4);',
			errors: 1,
		},
		{
			code: 'declare const bytes: Float64Array; const [, , ...rest] = bytes;',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		// Indexing a typed array reads the same element
		{
			code: 'const [, , third] = new Uint8Array(4);',
			output: 'const third = new Uint8Array(4)[2];',
			errors: 1,
		},
	],
});
