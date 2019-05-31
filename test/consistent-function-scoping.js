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
		function doFoo(foo) {
			function doBar(bar) {
				function doZaz(zaz) {
					return foo + bar + zaz;
				}
				return bar;
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
		}
	]
});
