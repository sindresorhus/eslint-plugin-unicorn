import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/consistent-function-scoping';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	ruleId: 'consistent-function-scoping',
	messageId: 'consistentFunctionScoping'
};

ruleTester.run('consistent-function-scoping', rule, {
	valid: [
		`
		function doFoo(foo) {
			return foo;
		}
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
		const doFoo = (foo) => (bar) => foo + bar;
		`,
		`
		const doFoo = () => {
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
			errors: [error]
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
			errors: [error]
		},
		{
			code: `
			function doFoo() {
				function doBar(bar) {
					return bar;
				}
			}
			`,
			errors: [error]
		},
		{
			code: `
			const doFoo = () => {
				const doBar = (bar) => {
					return bar;
				}
			}
			`,
			errors: [error]
		},
		{
			code: `
			const doFoo = () => (bar) => bar;
			`,
			errors: [error]
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
			errors: [error]
		},
	]
});
