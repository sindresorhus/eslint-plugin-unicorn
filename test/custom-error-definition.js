import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/custom-error-definition';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const invalidClassNameError = {ruleId: 'custom-error-definition', message: 'Invalid class name, use `FooError`.'};
const constructorError = {ruleId: 'custom-error-definition', message: 'Add a constructor to your error.'};
const noSuperCallError = {ruleId: 'custom-error-definition', message: 'Missing call to `super()` in constructor.'};
const invalidNameError = name => ({ruleId: 'custom-error-definition', message: `The \`name\` property should be set to \`${name}\`.`});
const passMessageToSuperError = {ruleId: 'custom-error-definition', message: 'Pass the error message to `super()`.'};
const invalidMessageAssignmentError = {ruleId: 'custom-error-definition', message: 'Pass the error message to `super()` instead of setting `this.message`.'};

ruleTester.run('custom-error-definition', rule, {
	valid: [
		'class Foo { }',
		'class Foo extends Bar { }',
		'class Foo extends Bar() { }',
		'const Foo = class { }',
		`
			const FooError = class extends Error {
				constructor(message) {
					super(message);
					this.name = 'FooError';
				}
			}
		`,
		`
			class FooError extends Http.ProtocolError {
				constructor(message) {
					super(message);
					this.name = 'FooError';
				}
			}
		`,
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
				invalidClassNameError,
				invalidNameError('fooError')
			]
		},
		{
			code: `
				class fooError extends Error {
					constructor(message) {
						super(message);
						this.name = 'fooError';
					}
				}
			`,
			errors: [
				invalidClassNameError
			]
		},
		{
			code: `
				class Foo extends Error {
					constructor(message) {
						super(message);
						this.name = 'Foo';
					}
				}
			`,
			errors: [
				invalidClassNameError
			]
		},
		{
			code: `
				class fooerror extends Error {
					constructor(message) {
						super(message);
						this.name = 'fooerror';
					}
				}
			`,
			errors: [
				invalidClassNameError
			]
		},
		{
			code: `
				class FooError extends Error {
					constructor() { }
				}
			`,
			errors: [
				noSuperCallError,
				invalidNameError('FooError')
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
				invalidNameError('FooError'),
				passMessageToSuperError,
				invalidMessageAssignmentError
			],
			output: `
				class FooError extends Error {
					constructor() {
						super('My custom message');
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
				invalidNameError('FooError')
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
				invalidNameError('FooError')
			]
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
						super();
						this.message = message;
						this.name = 'FooError';
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
		},
		{
			code: `
				class FooError extends Error {
					constructor(message) {
						super();
						this.message = message;
					}
				}
			`,
			errors: [
				invalidNameError('FooError'),
				passMessageToSuperError,
				invalidMessageAssignmentError
			],
			output: `
				class FooError extends Error {
					constructor(message) {
						super(message);
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
		},
		{
			code: `
				class FooError extends Http.ProtocolError {
					constructor() {
						super();
						this.name = 'foo';
					}
				}
			`,
			errors: [
				invalidNameError('FooError')
			]
		}
	]
});
