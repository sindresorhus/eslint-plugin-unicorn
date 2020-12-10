import {outdent} from 'outdent';
import {test} from './utils/test';

const MESSAGE_ID_FINDINDEX = 'findIndex';

const errorsFindIndex = [
	{
		messageId: MESSAGE_ID_FINDINDEX
	}
];

test({
	valid: [
		'const findIndex = foo.findIndex',

		// Test `foo.findIndex`
		// More/less argument(s)
		'foo.findIndex()',
		'foo.findIndex(function (x) {return x === 1;}, bar)',
		'foo.findIndex(...[function (x) {return x === 1;}])',
		// Not `CallExpression`
		'new foo.findIndex(x => x === 1)',
		// Not `MemberExpression`
		'findIndex(x => x === 1)',
		// `callee.property` is not a `Identifier`
		'foo["findIndex"](x => x === 1)',
		// Computed
		'foo[findIndex](x => x === 1)',
		// Not `findIndex`
		'foo.notListedMethod(x => x === 1)',

		// Test `callback` part
		// Not function
		'foo.findIndex(myFunction)',
		// Not one parameter
		'foo.findIndex((x, i) => x === i)',
		'foo.findIndex((x, i) => {return x === i})',
		'foo.findIndex(function(x, i) {return x === i})',
		// Parameter is not `Identifier`
		'foo.findIndex(({x}) => x === 1)',
		'foo.findIndex(({x}) => {return x === 1})',
		'foo.findIndex(function({x}) {return x === 1})',

		// Test `callback` body
		// Not only `return`
		'foo.findIndex(({x}) => {noop();return x === 1})',
		// Not `return`
		'foo.findIndex(({x}) => {bar(x === 1)})',

		// Test `BinaryExpression`
		// Not `BinaryExpression`
		'foo.findIndex(x => x - 1)',
		'foo.findIndex(x => {return x - 1})',
		'foo.findIndex(function (x){return x - 1})',
		// Not `===`
		'foo.findIndex(x => x !== 1)',
		'foo.findIndex(x => {return x !== 1})',
		'foo.findIndex(function (x){return x !== 1})',
		// Neither `left` nor `right` is Identifier
		'foo.findIndex(x => 1 === 1.0)',
		'foo.findIndex(x => {return 1 === 1.0})',
		'foo.findIndex(function (x){return 1 === 1.0})',

		// Not the same identifier
		'foo.findIndex(x => y === 1)',

		// Dynamical value
		'foo.findIndex(x => x + "foo" === "foo" + x)',

		// `x` is used
		'foo.findIndex(x => x === "foo" + x)',

		// Already valid case
		'foo.indexOf(0)'
	],

	invalid: [
		{
			code: 'values.findIndex(x => x === "foo")',
			output: 'values.indexOf("foo")',
			errors: errorsFindIndex
		},
		{
			code: 'values.findIndex(x => "foo" === x)',
			output: 'values.indexOf("foo")',
			errors: errorsFindIndex
		},
		{
			code: 'values.findIndex(x => {return x === "foo";})',
			output: 'values.indexOf("foo")',
			errors: errorsFindIndex
		},
		{
			code: 'values.findIndex(function (x) {return x === "foo";})',
			output: 'values.indexOf("foo")',
			errors: errorsFindIndex
		}
	]
});

test.typescript({
	valid: [],
	invalid: [
		{
			code: outdent`
				function foo() {
					return (bar as string).findIndex(x => x === "foo");
				}
			`,
			output: outdent`
				function foo() {
					return (bar as string).indexOf("foo");
				}
			`,
			errors: errorsFindIndex
		}
	]
});
