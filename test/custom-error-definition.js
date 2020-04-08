import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/custom-error-definition';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const typescriptRuleTester = avaRuleTester(test, {
	parser: require.resolve('@typescript-eslint/parser')
});

const invalidClassNameError = {ruleId: 'custom-error-definition', message: 'Invalid class name, use `FooError`.'};
const constructorError = {ruleId: 'custom-error-definition', message: 'Add a constructor to your error.'};
const noSuperCallError = {ruleId: 'custom-error-definition', message: 'Missing call to `super()` in constructor.'};
const invalidNameError = name => ({ruleId: 'custom-error-definition', message: `The \`name\` property should be set to \`${name}\`.`});
const passMessageToSuperError = {ruleId: 'custom-error-definition', message: 'Pass the error message to `super()` instead of setting `this.message`.'};
const invalidExportError = {
	ruleId: 'custom-error-definition',
	messageId: 'invalidExport'
};

const tests = {
	valid: [
		'class Foo { }',
		'class Foo extends Bar { }',
		'class Foo extends Bar() { }',
		'const Foo = class { }',
		outdent`
			const FooError = class extends Error {
				constructor(message) {
					super(message);
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends Http.ProtocolError {
				constructor(message) {
					super(message);
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(message) {
					super(message);
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends Error {
				constructor() {
					super('My super awesome Foo Error');
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends TypeError {
				constructor() {
					super();
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			export class FooError extends TypeError {
				constructor() {
					super();
					this.name = 'FooError';
				}
			};
		`,
		outdent`
			export default class FooError extends TypeError {
				constructor() {
					super();
					this.name = 'FooError';
				}
			};
		`,
		outdent`
			module.exports = class FooError extends TypeError {
				constructor() {
					super();
					this.name = 'FooError';
				}
			};
		`,
		outdent`
			exports.FooError = class FooError extends TypeError {
				constructor() {
					super();
					this.name = 'FooError';
				}
			};
		`,
		outdent`
			exports.FooError = class extends Error {
				constructor(error) {
					super(error);
				}
			};
		`,
		outdent`
			exports.fooError = class extends Error {
				constructor(error) {
					super(error);
					this.name = 'fooError';
				}
			};
		`,
		`
			exports.whatever = class Whatever {};
		`,
		outdent`
			class FooError extends Error {
				constructor(error) {
					super(error);
					this.name = 'FooError';
				}
			};
			exports.fooError = FooError;
		`,
		outdent`
			class FooError extends Error {
				constructor() {
					super();
					this.name = 'FooError';
					someThingNotThis.message = 'My custom message';
				}
			}
		`
	],
	invalid: [
		{
			code: outdent`
				class FooError extends Error {}
			`,
			errors: [
				constructorError
			],
			output: outdent`
				class FooError extends Error {
					constructor() {
						super();
						this.name = 'FooError';
					}
				}
			`
		},
		{
			code: outdent`
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
			code: outdent`
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
			code: outdent`
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
			code: outdent`
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
			code: outdent`
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
			code: outdent`
				class FooError extends Error {
					constructor() {
						super();
						this.message = 'My custom message';
					}
				}
			`,
			errors: [
				invalidNameError('FooError'),
				passMessageToSuperError
			],
			output: outdent`
				class FooError extends Error {
					constructor() {
						super('My custom message');
					}
				}
			`
		},
		{
			code: outdent`
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
			code: outdent`
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
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.message = message;
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passMessageToSuperError
			],
			output: outdent`
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super();
						this.message = message;
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passMessageToSuperError
			],
			output: outdent`
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super();
						this.message = message;
					}
				}
			`,
			errors: [
				invalidNameError('FooError'),
				passMessageToSuperError
			],
			output: outdent`
				class FooError extends Error {
					constructor(message) {
						super(message);
					}
				}
			`
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super();
						this.name = 'FooError';
						this.message = message;
					}
				}
			`,
			errors: [
				passMessageToSuperError
			],
			output: outdent`
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`
		},
		{
			code: outdent`
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
		},
		{
			code: outdent`
				module.exports = class FooError extends TypeError {
					constructor() {
						super();
						this.name = 'foo';
					}
				};
			`,
			errors: [
				invalidNameError('FooError')
			]
		},
		{
			code: outdent`
				exports.fooError = class FooError extends Error {
					constructor(error) {
						super(error);
						this.name = 'FooError';
					}
				};
			`,
			errors: [invalidExportError],
			output: outdent`
				exports.FooError = class FooError extends Error {
					constructor(error) {
						super(error);
						this.name = 'FooError';
					}
				};
			`
		},
		{
			code: outdent`
				exports.FooError = class FooError extends TypeError {
					constructor() {
						super();
						this.name = 'foo';
					}
				};
			`,
			errors: [
				invalidNameError('FooError')
			]
		},
		{
			code: outdent`
				export class FooError extends TypeError {
					constructor() {
						super();
						this.name = 'foo';
					}
				};
			`,
			errors: [
				invalidNameError('FooError')
			]
		},
		{
			code: outdent`
				export default class FooError extends TypeError {
					constructor() {
						super();
						this.name = 'foo';
					}
				};
			`,
			errors: [
				invalidNameError('FooError')
			]
		},

		// #90
		{
			code: outdent`
				class AbortError extends Error {
					constructor(message) {
						if (message instanceof Error) {
							this.originalError = message;
							message = message.message;
						}

						super();
						this.name = 'AbortError';
						this.message = message;
					}
				}
			`,
			output: outdent`
				class AbortError extends Error {
					constructor(message) {
						if (message instanceof Error) {
							this.originalError = message;
							message = message.message;
						}

						super(message);
						this.name = 'AbortError';
					}
				}
			`,
			errors: [passMessageToSuperError]
		}
	]
};

ruleTester.run('custom-error-definition', rule, tests);
typescriptRuleTester.run('custom-error-definition', rule, tests);

typescriptRuleTester.run('custom-error-definition', rule, {
	valid: [
		outdent`
			class CustomError extends Error {
				constructor(type: string, text: string, reply?: any);
			}
		`
	],
	invalid: []
});
