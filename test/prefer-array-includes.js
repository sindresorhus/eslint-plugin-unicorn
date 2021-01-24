import {outdent} from 'outdent';
import {test} from './utils/test.js';

const MESSAGE_ID_REPLACE = 'replaceSome';

function suggestionCase({code, output}) {
	return {
		code,
		output: code,
		errors: [
			{
				suggestions: [
					{
						messageId: MESSAGE_ID_REPLACE,
						output
					}
				]
			}
		]
	};
}

test({
	valid: [
		'const some = foo.some',

		// Test `foo.some`
		// More/less argument(s)
		'foo.some()',
		'foo.some(function (x) {return x === 1;}, bar)',
		'foo.some(...[function (x) {return x === 1;}])',
		// Not `CallExpression`
		'new foo.some(x => x === 1)',
		// Not `MemberExpression`
		'some(x => x === 1)',
		// `callee.property` is not a `Identifier`
		'foo["some"](x => x === 1)',
		// Computed
		'foo[some](x => x === 1)',
		// Not `some`
		'foo.notListedMethod(x => x === 1)',

		// Test `callback` part
		// Not function
		'foo.some(myFunction)',
		// Not one parameter
		'foo.some((x, i) => x === i)',
		'foo.some((x, i) => {return x === i})',
		'foo.some(function(x, i) {return x === i})',
		// Parameter is not `Identifier`
		'foo.some(({x}) => x === 1)',
		'foo.some(({x}) => {return x === 1})',
		'foo.some(function({x}) {return x === 1})',
		// `generator`
		'foo.some(function * (x) {return x === 1})',
		// `async`
		'foo.some(async (x) => x === 1)',
		'foo.some(async (x) => {return x === 1})',
		'foo.some(async function(x) {return x === 1})',

		// Test `callback` body
		// Not only `return`
		'foo.some(({x}) => {noop();return x === 1})',
		// Not `return`
		'foo.some(({x}) => {bar(x === 1)})',

		// Test `BinaryExpression`
		// Not `BinaryExpression`
		'foo.some(x => x - 1)',
		'foo.some(x => {return x - 1})',
		'foo.some(function (x){return x - 1})',
		// Not `===`
		'foo.some(x => x !== 1)',
		'foo.some(x => {return x !== 1})',
		'foo.some(function (x){return x !== 1})',
		// Neither `left` nor `right` is Identifier
		'foo.some(x => 1 === 1.0)',
		'foo.some(x => {return 1 === 1.0})',
		'foo.some(function (x){return 1 === 1.0})',
		// Both `left` and `right` are same as `parameter`
		'foo.some(x => x === x)',

		// Not the same identifier
		'foo.some(x => y === 1)',

		// Dynamical value
		'foo.some(x => x + "foo" === "foo" + x)',

		// Parameter is used
		'foo.some(x => x === "foo" + x)',
		// Parameter is used in a deeper scope
		'foo.some(x => x === (function (){return x === "1"})())',
		// FunctionName is used
		'foo.some(function fn(x) {return x === fn(y)})',
		// `arguments` is used
		'foo.some(function(x) {return x === arguments.length})',
		// `this` is used
		'foo.some(function(x) {return x === this.length})',
		// `call` is done
		'foo.some(function(x) {return x === call()})',

		// Already valid case
		'foo.includes(0)'
	],

	invalid: [
		suggestionCase({
			code: 'values.some(x => x === foo())',
			output: 'values.includes(foo())'
		}),
		suggestionCase({
			code: 'values.some(x => foo() === x)',
			output: 'values.includes(foo())'
		})
	]
});

test.typescript({
	valid: [],
	invalid: [
		{
			code: outdent`
				function foo() {
					return (bar as string).some(x => x === "foo");
				}
			`,
			output: outdent`
				function foo() {
					return (bar as string).includes("foo");
				}
			`,
			errors: 1
		}
	]
});
