import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/consistent-function-scoping';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const arrowError = {
	ruleId: 'consistent-function-scoping',
	messageId: 'ArrowFunctionExpression'
};

const functionError = {
	ruleId: 'consistent-function-scoping',
	messageId: 'FunctionDeclaration'
};

ruleTester.run('consistent-function-scoping', rule, {
	valid: [
		`
		function doFoo(foo) {
			return foo;
		}
		`,
		`
		const doFoo = (foo) => foo;
		`,
		`
		function doFoo(foo) {
			function doBar(bar) {
				return foo + bar;
			}
			return foo;
		}
		`,
		`
		function doFoo(foo) {
			function doBar(bar) {
				return foo + bar;
			}
		}
		`,
		`
		function doFoo(foo = 'foo') {
			function doBar(bar) {
				return foo + bar;
			}
		}
		`,
		`
		function doFoo() {
			var foo = 'foo';
			function doBar(bar) {
				return foo + bar;
			}
			return foo;
		}
		`,
		`
		function doFoo(foo) {
			function doBar(bar) {
				function doZaz(zaz) {
					return foo + bar + zaz;
				}
				return bar;
			}
			return foo;
		}
		`,
		`
		for (var foo = 0; foo < 1; foo++) {
			function doBar(bar) {
			  	return bar + foo;
			}
		}
		`,
		`
		var foo = 0;
		function doFoo() {
			foo = 1;
			function doBar(bar) {
				return foo + bar;
			}
			return foo;
		}
		`,
		`
		const doFoo = (foo) => {
			return foo;
		}
		`,
		`
		const xxx =
			(yyy) =>
			(zzz) =>
			yyy + zzz;
		`,
		`
		const doFoo = () => {
			return (bar) => bar;
		}
		`,
		`
		function doFoo() {
			return (bar) => bar;
		}
		`,
		`
		const doFoo = (foo) => {
			const doBar = (bar) => {
				return foo + bar;
			}
			return foo;
		}
		`
	],
	invalid: [
		{
			code: `
			function doFoo(foo) {
				function doBar(bar) {
				  	return bar;
				}
				return foo;
			}
			`,
			errors: [functionError]
		},
		{
			code: `
			function doFoo() {
				var foo = 'foo';
				function doBar(bar) {
				  	return bar;
				}
				return foo;
			}
			`,
			errors: [functionError]
		},
		{
			code: `
			function doFoo() {
				function doBar(bar) {
					return bar;
				}
			}
			`,
			errors: [functionError]
		},
		{
			code: `
			const doFoo = () => {
				const doBar = (bar) => {
					return bar;
				}
			}
			`,
			errors: [arrowError]
		},
		{
			code: `
			const doFoo = () => (bar) => bar;
			`,
			errors: [arrowError]
		},
		{
			code: `
			function doFoo(foo) {
				function doBar(bar) {
					return doBar(bar);
				}
				return foo;
			}
			`,
			errors: [functionError]
		}
	]
});
