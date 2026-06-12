import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);
const error = {messageId: 'prefer-early-return'};

test.snapshot({
	valid: [
		outdent`
			function foo() {
				if (condition) {
					doSomething();
				}
			}
		`,
		outdent`
			function foo() {
				if (condition)
					doSomething();
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}

				finish();
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething();
					doSomethingElse();
				} else {
					doOtherThing();
				}
			}
		`,
		outdent`
			function foo() {
				if (condition) {
					doSomething();
				} else if (otherCondition) {
					doOtherThing();
				}
			}
		`,
		'const foo = () => condition ? doSomething() : doOtherThing();',
		{
			code: outdent`
				function foo() {
					if (condition) {
						doSomething();
						doSomethingElse();
					}
				}
			`,
			options: [{maximumStatements: 2}],
		},
		{
			code: outdent`
				function foo() {
					if (condition) {}
				}
			`,
			options: [{maximumStatements: 0}],
		},
	],
	invalid: [
		outdent`
			function foo() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
			}
		`,
		outdent`
			const foo = function() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
			};
		`,
		outdent`
			const foo = () => {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
			};
		`,
		outdent`
			callback(function() {
				if (condition) {
					doSomething();
					doSomethingElse();
				}
			});
		`,
		{
			code: outdent`
				function foo() {
					if (condition) {
						doSomething();
					}
				}
			`,
			options: [{maximumStatements: 0}],
		},
		{
			code: outdent`
				function foo() {
					if (condition)
						doSomething();
				}
			`,
			options: [{maximumStatements: 0}],
		},
	],
});

test({
	valid: [],
	invalid: [
		{
			code: outdent`
				function foo() {
					if (condition) {
						doSomething();
						doSomethingElse();
					}
				}
			`,
			errors: [error],
		},
	],
});
