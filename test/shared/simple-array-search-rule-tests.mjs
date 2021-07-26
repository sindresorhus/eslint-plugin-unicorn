import outdent from 'outdent';

function snapshotTests({method, replacement}) {
	return {
		valid: [
			`const ${method} = foo.${method}`,

			// Test `foo.findIndex`
			// More/less argument(s)
			`foo.${method}()`,
			`foo.${method}(function (x) {return x === 1;}, bar)`,
			`foo.${method}(...[function (x) {return x === 1;}])`,
			// Not `CallExpression`
			`new foo.${method}(x => x === 1)`,
			// Not `MemberExpression`
			`${method}(x => x === 1)`,
			// `callee.property` is not a `Identifier`
			`foo["${method}"](x => x === 1)`,
			// Computed
			`foo[${method}](x => x === 1)`,
			// Not `findIndex`
			'foo.notListedMethod(x => x === 1)',

			// Test `callback` part
			// Not function
			`foo.${method}(myFunction)`,
			// Not one parameter
			`foo.${method}((x, i) => x === i)`,
			`foo.${method}((x, i) => {return x === i})`,
			`foo.${method}(function(x, i) {return x === i})`,
			// Parameter is not `Identifier`
			`foo.${method}(({x}) => x === 1)`,
			`foo.${method}(({x}) => {return x === 1})`,
			`foo.${method}(function({x}) {return x === 1})`,
			// `generator`
			`foo.${method}(function * (x) {return x === 1})`,
			// `async`
			`foo.${method}(async (x) => x === 1)`,
			`foo.${method}(async (x) => {return x === 1})`,
			`foo.${method}(async function(x) {return x === 1})`,

			// Test `callback` body
			// Not only `return`
			`foo.${method}(({x}) => {noop();return x === 1})`,
			// Not `return`
			`foo.${method}(({x}) => {bar(x === 1)})`,

			// Test `BinaryExpression`
			// Not `BinaryExpression`
			`foo.${method}(x => x - 1)`,
			`foo.${method}(x => {return x - 1})`,
			`foo.${method}(function (x){return x - 1})`,
			// Not `===`
			`foo.${method}(x => x !== 1)`,
			`foo.${method}(x => {return x !== 1})`,
			`foo.${method}(function (x){return x !== 1})`,
			// Neither `left` nor `right` is Identifier
			`foo.${method}(x => 1 === 1.0)`,
			`foo.${method}(x => {return 1 === 1.0})`,
			`foo.${method}(function (x){return 1 === 1.0})`,
			// Both `left` and `right` are same as `parameter`
			`foo.${method}(x => x === x)`,

			// Not the same identifier
			`foo.${method}(x => y === 1)`,

			// Dynamical value
			`foo.${method}(x => x + "foo" === "foo" + x)`,

			// Parameter is used
			`foo.${method}(x => x === "foo" + x)`,
			// Parameter is used in a deeper scope
			`foo.${method}(x => x === (function (){return x === "1"})())`,
			// FunctionName is used
			`foo.${method}(function fn(x) {return x === fn(y)})`,
			// `arguments` is used
			`foo.${method}(function(x) {return x === arguments.length})`,
			// `this` is used
			`foo.${method}(function(x) {return x === this.length})`,

			// Already valid case
			`foo.${replacement}(0)`,
		],

		invalid: [
			`values.${method}(x => x === "foo")`,
			`values.${method}(x => "foo" === x)`,
			`values.${method}(x => {return x === "foo";})`,
			`values.${method}(function (x) {return x === "foo";})`,
			outdent`
				// 1
				(0, values)
					// 2
					./* 3 */${method} /* 3 */ (
						/* 4 */
						x /* 5 */ => /* 6 */ x /* 7 */ === /* 8 */ "foo" /* 9 */
					) /* 10 */
			`,
			outdent`
				foo.${method}(function (element) {
					return element === bar.${method}(x => x === 1);
				});
			`,
			`values.${method}(x => x === (0, "foo"))`,
			`values.${method}((x => x === (0, "foo")))`,
			// `this`/`arguments` in arrow functions
			outdent`
				function fn() {
					foo.${method}(x => x === arguments.length)
				}
			`,
			outdent`
				function fn() {
					foo.${method}(x => x === this[1])
				}
			`,
			`values.${method}(x => x === foo())`,
			outdent`
				foo.${method}(function a(x) {
					return x === (function (a) {
						return a(this) === arguments[1]
					}).call(thisObject, anotherFunctionNamedA, secondArgument)
				})
			`,
		],
	};
}

function typescriptTests({method, replacement}) {
	return {
		valid: [],
		invalid: [
			{
				code: outdent`
					function foo() {
						return (bar as string).${method}(x => x === "foo");
					}
				`,
				output: outdent`
					function foo() {
						return (bar as string).${replacement}("foo");
					}
				`,
				errors: 1,
			},
		],
	};
}

function tests(options) {
	return {
		snapshot: snapshotTests(options),
		typescript: typescriptTests(options),
	};
}

export default tests;
