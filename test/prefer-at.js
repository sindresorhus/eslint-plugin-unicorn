import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

// DOM collections do not support `.at()`, including when referenced through a variable.
const domCollectionInitializers = [
	'element.children',
	'parent.childNodes',
	'document.querySelectorAll("li")',
	'document.getElementsByClassName("item")',
	'document.getElementsByName("item")',
	'document.getElementsByTagName("li")',
	'document.getElementsByTagNameNS(namespace, "li")',
];
const domCollectionTypes = ['NodeList', 'NodeListOf<Element>', 'HTMLCollection', 'HTMLCollectionOf<Element>'];
const typescript = code => ({code, languageOptions: {parser: parsers.typescript}});

test({
	valid: [
		...domCollectionInitializers.flatMap(initializer => [
			`const nodes = ${initializer}; nodes[nodes.length - 1];`,
			`const nodes = ${initializer}; nodes.slice(-1)[0];`,
			`const nodes = ${initializer}; _.last(nodes);`,
			`_.last(${initializer});`,
			{code: `const nodes = ${initializer}; nodes[0];`, options: [{checkAllIndexAccess: true}]},
		]),
		'const nodes = document.querySelectorAll("li"); const alias = nodes; alias[alias.length - 1];',
		'const nodes = parent?.childNodes; nodes?.[nodes.length - 1];',
		'const nodes = document?.querySelectorAll?.("li"); _.last(nodes);',
		'const nodes = element.children; nodes.slice(-1).pop();',
		'const nodes = element.children; nodes.slice(-1).shift();',
		'const nodes = element.children; nodes.slice(-2, -1)[0];',
		'element.children.slice(-1)[0];',
		'lodash.last(element.children);',
		'underscore.last(element.childNodes);',
		{
			code: 'const nodes = document.querySelectorAll("li"); utils.lastElement(nodes);',
			options: [{getLastElementFunctions: ['utils.lastElement']}],
		},
		...domCollectionTypes.flatMap(type => [typescript, typeAware].map(parser => parser(`function foo(nodes: ${type}) { nodes[nodes.length - 1]; nodes.slice(-1)[0]; _.last(nodes); }`))),
		typescript('const nodes = document.querySelectorAll("li") as NodeListOf<Element>; (nodes as NodeListOf<Element>)[nodes.length - 1];'),
		typescript('const nodes = <NodeList>element.childNodes; _.last(<NodeList>nodes);'),
		typescript('const nodes = element.children satisfies HTMLCollection; nodes![nodes!.length - 1];'),
		typescript('type Nodes = NodeListOf<Element>; function foo(nodes: Nodes) { _.last(nodes); }'),
		typescript('function foo(nodes: NodeList | HTMLCollection) { _.last(nodes); }'),
		typescript('function foo(nodes: NodeList | undefined) { return nodes?.[nodes.length - 1]; }'),
		{...typescript('function foo(nodes: HTMLCollection | null) { return nodes?.[0]; }'), options: [{checkAllIndexAccess: true}]},
		{...typescript('function foo(nodes: NodeList) { return nodes[0]; }'), options: [{checkAllIndexAccess: true}]},
		typeAware('declare function getNodes(): NodeListOf<Element>; const nodes = getNodes(); nodes[nodes.length - 1];'),
		typeAware('declare const source: {nodes: HTMLCollection}; _.last(source.nodes);'),
		typeAware('type Nodes = ReturnType<() => NodeListOf<Element>>; declare const nodes: Nodes; _.last(nodes);'),
		typeAware('function foo(nodes: NodeList | undefined) { return nodes?.[nodes.length - 1]; }'),
	],
	invalid: [],
});

// Index access
test.snapshot({
	valid: [
		'array.at(-1)',
		'array[array.length - 0];',
		'array[array.length + 1]',
		'array[array.length + -1]',
		'const modes = new Set([\'foo\']); modes.clear(); array[modes.size ? 1 : \'x\'];',
		'const modes = new Set([\'foo\']); modes.clear(); array[(modes.size && 1) || index];',
		typeAware('const modes = new Set([\'foo\']); modes.clear(); array[(modes.size ? 1 : index) as number];'),
		'foo[bar.length - 1]',
		// `array[array.length - n]` and `array.at(-n)` only agree for a whole number of elements
		'array[array.length - 0.5]',
		'array[array.length - 1.5]',
		// LHS
		'array[array.length - 1] = 1',
		'array[array.length - 1] %= 1',
		'++ array[array.length - 1]',
		'array[array.length - 1] --',
		'delete array[array.length - 1]',
		'class Foo {bar; #bar; baz() {return this.#bar[this.bar.length - 1]}}',
		'([array[array.length - 1]] = [])',
		'({foo: array[array.length - 1] = 9} = {})',
		'function foo() {return arguments[arguments.length - 1]}',
		'parent?.childNodes[parent.childNodes.length - 1];',
		'element.children[element.children.length - 1];',
		'document.querySelectorAll("li")[document.querySelectorAll("li").length - 1];',
	],
	invalid: [
		'array[array.length - 1];',
		'array?.[array.length - 1];',
		'array[array.length -1];',
		'array[array.length - /* comment */ 1];',
		'array[array.length - 1.];',
		'array[array.length - 0b1];',
		'array[array.length - 9];',
		'array[0][array[0].length - 1];',
		'array[(( array.length )) - 1];',
		'array[array.length - (( 1 ))];',
		'array[(( array.length - 1 ))];',
		'(( array ))[array.length - 1];',
		'(( array[array.length - 1] ));',
		'array[array.length - 1].pop().shift()[0];',
		'a = array[array.length - 1]',
		'const a = array[array.length - 1]',
		'const {a = array[array.length - 1]} = {}',
		'typeof array[array.length - 1]',
		'class Foo {bar; baz() {return this.bar[this.bar.length - 1]}}',
		'class Foo {#bar; baz() {return this.#bar[this.#bar.length - 1]}}',
		{
			code: '(array as Foo[])[array.length - 1]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(array as Foo[])[(array as Foo[]).length - 1]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '<Foo[]>array[array.length - 1]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '<Foo[]>array[(<Foo[]>array).length - 1]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array![array.length - 1]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array![array!.length - 1]',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// String index access
// Positive index access is not checked by default, even on known strings. It requires the `checkAllIndexAccess` option, just like arrays.
test.snapshot({
	valid: [
		'array[0]',
		'unknown[0]',
		'1[0]',
		'({0: "a"})[0]',
		'const object = {0: "a"}; object[0]',
		'string[unknown]',
		'string[-1]',
		'string[1.5]',
		'string[1n]',
		'string[0] = value',
		'"string"[1]',
		'`string`[1]',
		'String(value)[0]',
		'String.fromCodePoint(65)[0]',
		'(typeof value)[0]',
		'const string = "string"; string[1]',
		'String.fromCharCode(65)[0]',
		{
			code: 'function foo(value: string | number) { return value[0]; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: number) { return value[0]; }',
			languageOptions: {parser: parsers.typescript},
		},
		'const value = other; const other = value; value[0];',
		{
			code: 'type Value = Other; type Other = Value; function foo(value: Value) { return value[0]; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(value as string)[0]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(value satisfies string)[0]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(<string>value)[0]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: string) { return value![0]; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function foo(value: string) { return value[0]; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const value: string | number = "string"; value[0];',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const value: unknown = "string"; value[0];',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type StringAlias = string; function foo(value: StringAlias) { return value[0]; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'type StringUnion = "a" | "b"; function foo(value: StringUnion) { return value[0]; }',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare function getValue(): string; getValue()[0];'),
		typeAware('type Value = ReturnType<() => string>; declare const value: Value; value[0];'),
		typeAware('function foo(value: string | number) { if (typeof value === "string") { return value[0]; } }'),
	],
	invalid: [
		// Negative index access on strings is still checked by default.
		'"string"["string".length - 1]',
		'const string = "string"; string[string.length - 1]',
	],
});

// `String#charAt`
test.snapshot({
	valid: [
		'string.charAt(string.length - 0);',
		'string.charAt(string.length + 1)',
		'string.charAt(string.length + -1)',
		'foo.charAt(bar.length - 1)',
		'string?.charAt?.(string.length - 1);',
		'string.charAt(9);',
	],
	invalid: [
		'string.charAt(string.length - 1);',
		'string?.charAt(string.length - 1);',
		'string.charAt(string.length - 0o11);',
		'some.string.charAt(some.string.length - 1);',
		'string.charAt((( string.length )) - 0xFF);',
		'string.charAt(string.length - (( 1 )));',
		'string.charAt((( string.length - 1 )));',
		'(( string )).charAt(string.length - 1);',
		'(( string.charAt ))(string.length - 1);',
		'(( string.charAt(string.length - 1) ));',
		{
			code: '(string as string).charAt((string as string).length - 1);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '<string>string.charAt((<string>string).length - 1);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'string!.charAt(string!.length - 1);',
			languageOptions: {parser: parsers.typescript},
		},
		// A comment inside the `.length` access would be lost, so there is no suggestion
		'string.charAt(string /* keep */ .length - 1);',
	],
});

// `String#substring`
test.snapshot({
	valid: [
		'string.substring()',
		'string.substring(0)',
		'string.substring(index)',
		'string.substring(0, 2)',
		'string.substring(-1, 0)',
		'string.substring(1.5, 2.5)',
		'string.substring(index, index + 2)',
		'string.substring(index, other + 1)',
		'string.substring(other, index + 1)',
		'string.substring(index, index + length)',
		'string.substring(index, length + index)',
		'string.substring(...arguments)',
		'string.substring(index, index + 1, extraArgument)',
	],
	invalid: [
		'string.substring(0, 1)',
		'string.substring(1, 2)',
		'string.substring(2, 1)',
		'string.substring(index, index + 1)',
		'string.substring(index, 1 + index)',
		'string.substring(index - 1, index)',
		'string.substring(index + 1, index)',
		'string.substring(1 + index, index)',
		'string.substring(index, /* comment */ index + 1)',
		'string.substring(index, index + /* comment */ 1)',
		// Literal arguments with a comment between them (suppresses the suggestion)
		'string.substring(0, /* between */ 1)',
		'string.substring((( index )), (( index )) + 1)',
		'string.substring((( index )) - 1, (( index )))',
		'(( string )).substring(index, index + 1)',
		'string?.substring(index, index + 1)',
		'string.substring?.(index, index + 1)',
	],
});

// `.slice()` with one argument
test.snapshot({
	valid: [
		'array.slice(-1)',
		'new array.slice(-1)',
		'array.slice(-0)[0]',
		'array.slice(-9).pop()',
		'array.slice(-1.1)[0]',
		'array.slice(-1)?.[0]',
		'array.slice?.(-1)[0]',
		'array.notSlice(-1)[0]',
		'array.slice()[0]',
		'array.slice(...[-1])[0]',
		'array.slice(-1).shift?.()',
		'array.slice(-1)?.shift()',
		'array.slice(-1).shift(...[])',
		'new array.slice(-1).shift()',
		// LHS
		'array.slice(-1)[0] += 1',
		'++ array.slice(-1)[0]',
		'array.slice(-1)[0] --',
		'delete array.slice(-1)[0]',

		'array.slice(-9)[0]',
		'array.slice(-9).shift()',
		'array.slice(-0xA)[0b000]',
	],
	invalid: [
		'array.slice(-1)[0]',
		'array?.slice(-1)[0]',
		'array.slice(-1).pop()',
		'array.slice(-1.0).shift()',
		'array.slice(-1)[(( 0 ))];',
		'array.slice(-(( 1 )))[0];',
		'array.slice((( -1 )))[0];',
		'(( array.slice(-1) ))[0];',
		'(( array )).slice(-1)[0];',
		'(( array.slice(-1)[0] ));',
		'(( array.slice(-1) )).pop();',
		'(( array.slice(-1).pop ))();',
		'(( array.slice(-1).pop() ));',
		'array.slice(-1)[0].pop().shift().slice(-1)',
		{
			code: '(array as Foo[]).slice(-1)[0]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(array as Foo[]).slice(-1).pop()',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '(<Foo[]>array).slice(-1).pop()',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '<Foo[]>array.slice(-1)[0]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: '<Foo[]>array.slice(-1).shift()',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array!.slice(-1)[0]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'array!.slice(-1).pop()',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// `.slice()` with 2 arguments, and `endIndex` is 1 greater than `startIndex`
test.snapshot({
	valid: [
		'array.slice(-9.1, -8.1)[0]',
	],
	invalid: [
		'array.slice(-9, -8)[0]',
		'array.slice(-9, -0o10)[0]',
		'array.slice(-9, -8).pop()',
		'array.slice(-9, -8).shift()',
		'array.slice((( -9 )), (( -8 )), ).shift()',
		'(( array.slice(-9, -8).shift ))()',
	],
});

// `.slice()` with 2 arguments
test.snapshot({
	valid: [
		'array.slice(-unknown, -unknown2)[0]',
		'array.slice(-9.1, unknown)[0]',
		'array.slice(-9, unknown).pop()',
		'array.slice(-9, ...unknown)[0]',
		'array.slice(...[-9], unknown)[0]',
		// A slice that is not one element wide at the start index gives a different value, so `.at(start)` is not a replacement: `array.slice(-1, 0)[0]` is `undefined`
		'array.slice(-9, unknown)[0]',
		'array.slice(-0o11, -7)[0]',
		'array.slice(-9, unknown).shift()',
		'const KNOWN = -8; array.slice(-9, KNOWN).shift()',
		'array.slice(-9, 0)[0]',
		'(( (( array.slice( ((-9)), ((unknown)), ).shift ))() ));',
		'array.slice(-9, (a, really, _really, complicated, second) => argument)[0]',
	],
	invalid: [],
});

// Functions to get last element
test.snapshot({
	valid: [
		'new _.last(array)',
		'_.last(array, 2)',
		'_.last(...array)',
		'function foo() {return _.last(arguments)}',
		'function foo() {return lodash.last(arguments)}',
		'function foo() {return underscore.last(arguments)}',
		{
			code: 'function foo() {return getLast(arguments)}',
			options: [{getLastElementFunctions: ['getLast']}],
		},
	],
	invalid: [
		'_.last(array)',
		'lodash.last(array)',
		'underscore.last(array)',
		// Member-expression argument needs no parentheses
		'_.last(foo.bar)',
		// Should add `()` to `new Array`
		'_.last(new Array)',
		// Semicolon
		outdent`
			const foo = []
			_.last([bar])
		`,
		outdent`
			const foo = []
			_.last( new Array )
		`,
		outdent`
			const foo = []
			_.last( (( new Array )) )
		`,
		'if (foo) _.last([bar])',
		{
			code: '_.last(getLast(utils.lastOne(array)))',
			options: [{getLastElementFunctions: ['getLast', '  utils.lastOne  ']}],
		},
	],
});

// `checkAllIndexAccess` option
const setCheckAllIndexAccessTrue = cases => cases.map(testCase => {
	testCase = typeof testCase === 'string' ? {code: testCase} : testCase;
	return {...testCase, options: [{checkAllIndexAccess: true}]};
});
test.snapshot({
	valid: setCheckAllIndexAccessTrue([
		'const object = {value: true}; Object.defineProperty(object, \'value\', {get() { return false; }}); array[object.value ? 1 : index];',
		'++array[1]',
		'const offset = 5;const extraArgument = 6;string.charAt(offset + 9, extraArgument)',
		'array[unknown]',
		'array[-1]',
		'array[1.5]',
		'array[1n]',
		'function foo() {return arguments[0]}',
		'const object = {1: 1, a: 2}; object[1]',
		'({1: 1})[1]',
		{
			code: 'const object = {1: 1} as const; object[1]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {1: 1} satisfies Record<number, number>; object[1]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {1: 1}; (object as Record<number, number>)[1]',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const object = {1: 1}; object![1]',
			languageOptions: {parser: parsers.typescript},
		},
		'parent.childNodes[0]',
		'element.children[0]',
		'document.querySelectorAll("li")[0]',
		'document.getElementsByClassName("item")[0]',
		'document.getElementsByTagName("li")[0]',
		'document.getElementsByTagNameNS(namespace, "li")[0]',
		'document.getElementsByName("item")[0]',
	]),
	invalid: setCheckAllIndexAccessTrue([
		'array[0]',
		'array[1]',
		'array[5 + 9]',
		'const offset = 5;array[offset + 9]',
		// A `let` binding is not resolved, so the object is not recognized as a non-array.
		'let object = {1: 1, a: 2}; object[1]',
		'"string"[1]',
		'`string`[1]',
		'const string = "string"; string[1]',
		'new Uint8Array([1])[0]',
		'array[array.length - 1]',
		// `charAt` don't care about value
		'string.charAt(9)',
		'string.charAt(5 + 9)',
		'const offset = 5;string.charAt(offset + 9)',
		'string.charAt(unknown)',
		'string.charAt(1.5)',
		'string.charAt(1n)',
		'string.charAt(string.length - 1)',
		'foo.charAt(bar.length - 1)',
	]),
});

// `String#charAt()` returns `''` for a negative index while `String#at()` counts from the end
test({
	valid: [
		'string.charAt(-1)',
		'string.charAt(-1.5)',
		'string.charAt(-0x1)',
		'string.charAt(-0b1)',
		'string.charAt(1 - 2)',
		'const index = -1; string.charAt(index)',
	].map(code => ({code, options: [{checkAllIndexAccess: true}]})),
	invalid: [
		// A symbol index is not compared with `0`
		{
			code: 'string.charAt(Symbol.iterator)',
			options: [{checkAllIndexAccess: true}],
			errors: 1,
		},
		{
			code: 'const a = _.last(/* keep */ foo);',
			errors: 1,
		},
		{
			code: 'const a = _.last(foo);',
			output: 'const a = foo.at(-1);',
			errors: 1,
		},
	],
});

// A comment inside the `.length` access would be lost by the fix
test({
	valid: [],
	invalid: [
		{
			code: 'const a = array[array /* keep */ .length - 1];',
			errors: 1,
		},
		{
			// The comment sits between the bracket and the index, both are kept
			code: 'const a = array[/* keep */ array.length - 1];',
			output: 'const a = array.at(/* keep */ -1);',
			errors: 1,
		},
		{
			code: 'const a = array[(/* keep */ array.length) - 1];',
			errors: 1,
		},
		{
			code: 'const a = array[array.length - 1];',
			output: 'const a = array.at(-1);',
			errors: 1,
		},
		// A comment in the index that the fix does not remove is kept
		{
			code: 'const a = array[1 /* keep */ + 1];',
			output: 'const a = array.at(1 /* keep */ + 1);',
			options: [{checkAllIndexAccess: true}],
			errors: 1,
		},
	],
});

// A comment anywhere in the removed call would be lost
test({
	valid: [],
	invalid: [
		{
			code: 'array.slice(-1).pop(/* keep */)',
			errors: 1,
		},
		{
			code: 'array.slice(/* keep */ -1).pop()',
			errors: 1,
		},
		{
			code: 'array.slice(-1).shift()',
			output: 'array.at(-1)',
			errors: 1,
		},
		{
			code: 'array.slice(-1)[0 /* keep */]',
			errors: 1,
		},
		// A comment outside the removed `[0]` is kept
		{
			code: 'foo(array.slice(-1)[0], /* keep */ bar)',
			output: 'foo(array.at(-1), /* keep */ bar)',
			errors: 1,
		},
	],
});

// Unknown receivers and arrays converted from DOM collections must still be reported.
const reportedReceiverTypes = ['any', 'unknown', 'NodeList | string[]', 'string[]', 'readonly number[]', 'string', 'Uint8Array'];
test.snapshot({
	valid: [],
	invalid: [
		'const nodes = getNodes(); nodes[nodes.length - 1]; nodes.slice(-1)[0]; _.last(nodes);',
		'_.last(getNodes());',
		'const nodes = Array.from(document.querySelectorAll("li")); nodes[nodes.length - 1]; nodes.slice(-1)[0]; _.last(nodes);',
		'const nodes = [...element.children]; nodes[nodes.length - 1];',
		'_.last(Array.from(element.children));',
		'_.last([...element.childNodes]);',
		'const nodes = [1, 2]; nodes[nodes.length - 1];',
		'const string = "abc"; string[string.length - 1];',
		'const bytes = new Uint8Array([1, 2]); bytes[bytes.length - 1];',
		'const nodes = alias; const alias = nodes; _.last(nodes);',
		'let nodes = element.children; nodes = []; _.last(nodes);',
		'const {children: nodes} = element; _.last(nodes);',
		'const nodes = element.children; function foo(nodes) { return _.last(nodes); }',
		'_.last(document["querySelectorAll"]("li"));',
		...reportedReceiverTypes.flatMap(type => [typescript, typeAware].map(parser => parser(`function foo(value: ${type}) { return value[value.length - 1]; }`))),
		{code: 'const nodes = Array.from(element.children); nodes[0];', options: [{checkAllIndexAccess: true}]},
		{...typeAware('function foo(value: any) { return value[0]; }'), options: [{checkAllIndexAccess: true}]},
	],
});
