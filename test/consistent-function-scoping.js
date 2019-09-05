import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
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
		outdent`
			function doFoo(foo) {
				return foo;
			}
		`,
		outdent`
			function doFoo(foo) {
				return bar;
			}
		`,
		outdent`
			const doFoo = foo => foo;
		`,
		outdent`
			foo => foo;
		`,
		outdent`
			function doFoo(foo) {
				function doBar(bar) {
					return foo + bar;
				}
				return foo;
			}
		`,
		outdent`
			function doFoo(foo) {
				function doBar(bar) {
					return foo + bar;
				}
			}
		`,
		outdent`
			function doFoo(foo = 'foo') {
				function doBar(bar) {
					return foo + bar;
				}
			}
		`,
		outdent`
			function doFoo() {
				const foo = 'foo';
				function doBar(bar) {
					return foo + bar;
				}
				return foo;
			}
		`,
		outdent`
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
		outdent`
			for (let foo = 0; foo < 1; foo++) {
				function doBar(bar) {
					return bar + foo;
				}
			}
		`,
		outdent`
			let foo = 0;
			function doFoo() {
				foo = 1;
				function doBar(bar) {
					return foo + bar;
				}
				return foo;
			}
		`,
		outdent`
			const doFoo = foo => {
				return foo;
			}
		`,
		outdent`
			const doFoo =
				foo =>
				bar =>
				foo + bar;
		`,
		outdent`
			const doFoo = () => {
				return bar => bar;
			}
		`,
		outdent`
			function doFoo() {
				return bar => bar;
			}
		`,
		outdent`
			const doFoo = foo => {
				const doBar = bar => {
					return foo + bar;
				}
				return foo;
			}
		`,
		outdent`
			function doFoo() {
				{
					const foo = 'foo';
					function doBar(bar) {
						return bar + foo;
					}
				}
			}
		`,
		outdent`
			function doFoo(foo) {
				{
					function doBar(bar) {
						return bar;
					}
				}
				return foo;
			}
		`
	],
	invalid: [
		{
			code: outdent`
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
			code: outdent`
				function doFoo() {
					const foo = 'foo';
					function doBar(bar) {
						return bar;
					}
					return foo;
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				function doFoo() {
					function doBar(bar) {
						return bar;
					}
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				const doFoo = () => {
					const doBar = bar => {
						return bar;
					}
				}
			`,
			errors: [arrowError]
		},
		{
			code: outdent`
				const doFoo = () => bar => bar;
			`,
			errors: [arrowError]
		},
		{
			code: outdent`
				function doFoo(foo) {
					function doBar(bar) {
						return doBar(bar);
					}
					return foo;
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				function doFoo(foo) {
					function doBar(bar) {
						return bar;
					}
					return doBar;
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				function doFoo() {
					function doBar() {}
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				function doFoo(foo) {
					{
						{
							function doBar(bar) {
								return bar;
							}
						}
					}
					return foo;
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				{
					{
						function doBar(bar) {
							return bar;
						}
					}
				}
			`,
			errors: [functionError]
		},
		{
			code: outdent`
				for (let foo = 0; foo < 1; foo++) {
					function doBar(bar) {
						return bar;
					}
				}
			`,
			errors: [functionError]
		}
	]
});
