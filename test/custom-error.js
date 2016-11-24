import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/custom-error';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const invalidClassNameError = {ruleId: 'custom-error', message: 'Invalid class name, use `FooError`.'};
const constructorError = {ruleId: 'custom-error', message: 'Add a constructor to your error.'};
const noSuperCallError = {ruleId: 'custom-error', message: 'Missing call to `super()` in constructor.'};
const invalidNameError = {ruleId: 'custom-error', message: 'The `name` property should be set to `FooError`.'};
const passMessageToSuperError = {ruleId: 'custom-error', message: 'Pass the error message to `super()`.'};
const invalidMessageAssignmentError = {ruleId: 'custom-error', message: 'Pass the error message to `super()` instead of setting `this.message`.'};

ruleTester.run('custom-error', rule, {
	valid: [
		'class Foo { }',
		`
			class FooError extends Error {
				constructor(message) {
					super(message);
					this.name = 'FooError';
				}
			}
		`,
		`
			class FooError extends Error {
				constructor() {
					super('My super awesome Foo Error');
					this.name = 'FooError';
				}
			}
		`,
		`
			class FooError extends TypeError {
				constructor() {
					super();
					this.name = 'FooError';
				}
			}
		`
	],
	invalid: [
		{
			code: `
				class FooError extends Error {}
			`,
			errors: [
				constructorError
			],
			output: `
				class FooError extends Error {
	constructor() {
		super();
		this.name = 'FooError';
	}
}
			`
		},
		{
			code: `
				class fooError extends Error {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				invalidClassNameError
			],
			output: `
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`
		},
		{
			code: `
				class Foo extends Error {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				invalidClassNameError
			],
			output: `
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`
		},
		{
			code: `
				class fooerror extends Error {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				invalidClassNameError
			],
			output: `
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`
		},
		{
			code: `
				class FooError extends Error {
					constructor() { }
				}
			`,
			errors: [
				noSuperCallError,
				invalidNameError
			]
		},
		{
			code: `
				class FooError extends Error {
					constructor() {
						super();
						this.message = 'My custom message';
					}
				}
			`,
			errors: [
				invalidNameError,
				passMessageToSuperError,
				invalidMessageAssignmentError
			],
			output: `
				class FooError extends Error {
					constructor() {
						super('My custom message');
					this.name = 'FooError';
}
				}
			`
		},
		{
			code: `
				class FooError extends Error {
					constructor() {
						super();
					}
				}
			`,
			errors: [
				invalidNameError
			]
		},
		{
			code: `
				class FooError extends Error {
					constructor(message) {
						super(message);
					}
				}
			`,
			errors: [
				invalidNameError
			]
		},
		{
			code: `
				class FooError extends Error {
					constructor() {
						super('My awesome Foo Error');
					}
				}
			`,
			errors: [
				invalidNameError
			]
		},
		{
			code: `
				class FooError extends Error {
					constructor() {
						super('My awesome Foo Error');
						this.name = this.constructor.name;
					}
				}
			`,
			errors: [
				invalidNameError
			],
			output: `
				class FooError extends Error {
					constructor() {
						super('My awesome Foo Error');
						this.name = 'FooError';
					}
				}
			`
		},
		{
			code: `
				class foo extends Error {
					constructor() {
						super('My awesome Foo Error');
						this.name = 'foo';
					}
				}
			`,
			errors: [
				invalidClassNameError,
				invalidNameError
			],
			output: `
				class FooError extends Error {
					constructor() {
						super('My awesome Foo Error');
						this.name = 'FooError';
					}
				}
			`
		},
		{
			code: `
				class FooError extends Error {
					constructor() {
						super('My awesome Foo Error');
						this.name = 'foo';
					}
				}
			`,
			errors: [
				invalidNameError
			],
			output: `
				class FooError extends Error {
					constructor() {
						super('My awesome Foo Error');
						this.name = 'FooError';
					}
				}
			`
		},
		{
			code: `
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.message = message;
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				invalidMessageAssignmentError
			],
			output: `
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`
		},
		{
			code: `
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.message = message;
					}
				}
			`,
			errors: [
				invalidNameError,
				invalidMessageAssignmentError
			],
			output: `
				class FooError extends Error {
					constructor(message) {
						super(message);
					this.name = 'FooError';
}
				}
			`
		},
		{
			code: `
				class FooError extends Error {
					constructor(message) {
						super();
						this.name = 'FooError';
						this.message = message;
					}
				}
			`,
			errors: [
				passMessageToSuperError,
				invalidMessageAssignmentError
			],
			output: `
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`
		}
	]
});
