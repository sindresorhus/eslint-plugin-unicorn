import outdent from 'outdent';
import {getTester, avoidTestTitleConflict} from './utils/test.js';

const {test} = getTester(import.meta);

const invalidClassNameError = {message: 'Invalid class name, use `FooError`.'};
const invalidNameError = name => ({message: `The \`name\` property should be set to \`${name}\`.`});
const noSuperCallError = {message: 'Missing call to `super()` in constructor.'};
const passMessageToSuperError = {message: 'Pass the error message to `super()` instead of setting `this.message`.'};
const doNotPassMessageToSuperError = {messageId: 'doNotPassMessageToSuper'};
const doNotAssignMessageWithoutSetterError = {messageId: 'doNotAssignMessageWithoutSetter'};
const missingOptionsParameterError = {messageId: 'missingOptionsParameter'};
const invalidOptionsParameterError = {messageId: 'invalidOptionsParameter'};
const passMessageArgumentToSuperError = {messageId: 'passMessageToSuper'};
const passOptionsToSuperError = {messageId: 'passOptionsToSuper'};
const invalidExportError = {
	messageId: 'invalidExport',
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
				constructor(message, options) {
					super(message, options);
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(message, options) {
					super(message, options);
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(message, options) {
					super(message, options);
					this.details = options?.details;
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(filePath, options) {
					super(\`File not found: \${filePath}\`, options);
					this.name = 'FooError';
				}
			}
		`,
		// Rest parameters: the `options` requirement is not enforced
		outdent`
			class FooError extends Error {
				constructor(...args) {
					super(...args);
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(options) {
					super('Fixed message', options);
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(message, options = {}) {
					super(message, options);
					this.name = 'FooError';
				}
			}
		`,
		// `options` is forwarded to `super()` inline, so no dedicated `options` parameter is needed
		outdent`
			class FooError extends Error {
				constructor(cause) {
					super('The request timed out', {cause});
					this.name = 'FooError';
				}
			}
		`,
		// Inline options with a non-shorthand `cause` property
		outdent`
			class FooError extends Error {
				constructor(error) {
					super('The request timed out', {cause: error});
					this.name = 'FooError';
				}
			}
		`,
		// Inline options with a string-literal `cause` key
		outdent`
			class FooError extends Error {
				constructor(error) {
					super('The request timed out', {'cause': error});
					this.name = 'FooError';
				}
			}
		`,
		// Inline options with a hard-coded message built from a template literal
		outdent`
			class FooError extends Error {
				constructor(cause) {
					super(\`The request timed out\`, {cause});
					this.name = 'FooError';
				}
			}
		`,
		// Inline options forwarded to a custom `*Error` super class (the reported real-world case)
		outdent`
			class TimeoutError extends FetchError {
				constructor(cause) {
					super('The request timed out', {cause});
					this.name = 'TimeoutError';
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
			class FooError extends Error {
				name = 'FooError';
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
				constructor(error, options) {
					super(error, options);
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
		`,
		outdent`
			class FooError extends Error {
				#message;

				constructor(message, options) {
					super(undefined, options);
					this.#message = message;
					this.name = 'FooError';
				}

				get message() {
					return this.#message;
				}
			}
		`,
		outdent`
			class FooError extends Error {
				#message;

				constructor(message, options) {
					super(undefined, options);
					this.message = message;
					this.name = 'FooError';
				}

				get message() {
					return this.#message;
				}

				set message(message) {
					this.#message = message;
				}
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(message, options) {
					super(undefined, options);
					this.message = message;
					this.name = 'FooError';
				}

				set message(message) {
					this._message = message;
				}
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(message, options) {
					super(message, options);
					this.message += message;
					this.name = 'FooError';
				}
			}
		`,
	],
	invalid: [
		{
			code: outdent`
				class FooError extends Error {}
			`,
			errors: [
				invalidNameError('FooError'),
			],
			output: outdent`
				class FooError extends Error {
					name = 'FooError';
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					name = 'BadError';
				}
			`,
			errors: [
				invalidNameError('FooError'),
			],
			output: outdent`
				class FooError extends Error {
					name = 'FooError';
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					static name = 'FooError';
				}
			`,
			errors: [
				invalidNameError('FooError'),
			],
			output: outdent`
				class FooError extends Error {
					name = 'FooError';

					static name = 'FooError';
				}
			`,
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
				invalidNameError('fooError'),
			],
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
				invalidClassNameError,
			],
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
				invalidClassNameError,
			],
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
				invalidClassNameError,
			],
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor() { }
				}
			`,
			errors: [
				noSuperCallError,
				invalidNameError('FooError'),
			],
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
				passMessageToSuperError,
			],
			output: outdent`
				class FooError extends Error {
					constructor() {
						super('My custom message');
					}
				}
			`,
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
				invalidNameError('FooError'),
			],
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
				invalidNameError('FooError'),
			],
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
				passMessageToSuperError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super('Fallback message');
						this.message = message;
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passMessageToSuperError,
			],
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
				passMessageToSuperError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
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
				passMessageToSuperError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(message, options);
					}
				}
			`,
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
				passMessageToSuperError,
			],
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
				invalidNameError('FooError'),
			],
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
				invalidNameError('FooError'),
			],
		},
		{
			code: outdent`
				exports.fooError = class FooError extends Error {
					constructor(error, options) {
						super(error, options);
						this.name = 'FooError';
					}
				};
			`,
			errors: [invalidExportError],
			output: outdent`
				exports.FooError = class FooError extends Error {
					constructor(error, options) {
						super(error, options);
						this.name = 'FooError';
					}
				};
			`,
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
				invalidNameError('FooError'),
			],
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
				invalidNameError('FooError'),
			],
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
				invalidNameError('FooError'),
			],
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
			errors: [passMessageToSuperError],
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super();
						this.message = this.format(message);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passMessageToSuperError,
			],
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message = 'Default message') {
						super(message);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(message = 'Default message', options) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super(undefined);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(filePath) {
						super(undefined);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(filePath, options) {
						super(undefined, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(cause) {
						super('Fixed message', cause);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(details) {
						super('Fixed message', {details});
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super('Fixed message', {cause: message});
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
		},
		// The inline options object has more than just `cause`, so `options` should be a parameter
		{
			code: outdent`
				class FooError extends Error {
					constructor(cause) {
						super('Fixed message', {cause, code: 1});
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
		},
		// Extra arguments after the inline options are not a recognized forwarding pattern
		{
			code: outdent`
				class FooError extends Error {
					constructor(cause) {
						super('Fixed message', {cause}, cause);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
		},
		// The message is computed, not hard-coded, so `options` should be a parameter
		{
			code: outdent`
				class FooError extends Error {
					constructor(cause) {
						super(getMessage(), {cause});
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(message);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passOptionsToSuperError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super();
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passMessageArgumentToSuperError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(undefined, options);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passMessageArgumentToSuperError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(undefined);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passMessageArgumentToSuperError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(options) {
						super(options);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passOptionsToSuperError,
			],
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(options) {
						super();
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passOptionsToSuperError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(options) {
						super(undefined, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(options) {
						super('Fixed message');
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passOptionsToSuperError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(options) {
						super('Fixed message', options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message, details) {
						super(message);
						this.details = details;
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				invalidOptionsParameterError,
			],
		},
		{
			// Second parameter named `opts` instead of `options`
			code: outdent`
				class FooError extends Error {
					constructor(message, opts) {
						super(message, opts);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				invalidOptionsParameterError,
			],
		},
		{
			// `name` assigned via a template literal instead of a string literal
			code: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(message, options);
						this.name = \`FooError\`;
					}
				}
			`,
			errors: [
				invalidNameError('FooError'),
			],
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor() {
						super();
						this.message = foo.error;
						this.name = 'FooError';
					}
				}
			`,
			output: outdent`
				class FooError extends Error {
					constructor() {
						super(foo.error);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passMessageToSuperError,
			],
		},
		{
			code: outdent`
				class FooError extends Error {
					#message;

					constructor(message) {
						super();
						this.#message = message;
						this.name = 'FooError';
					}

					get message() {
						return this.#message;
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
			output: outdent`
				class FooError extends Error {
					#message;

					constructor(message, options) {
						super(undefined, options);
						this.#message = message;
						this.name = 'FooError';
					}

					get message() {
						return this.#message;
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					#message;

					constructor(message) {
						super(message);
						this.#message = message;
						this.name = 'FooError';
					}

					get message() {
						return this.#message;
					}
				}
			`,
			errors: [
				doNotPassMessageToSuperError,
			],
		},
		{
			code: outdent`
				class FooError extends Error {
					#message;

					constructor(message, options) {
						super(message, options);
						this.#message = message;
						this.name = 'FooError';
					}

					get message() {
						return this.#message;
					}
				}
			`,
			errors: [
				doNotPassMessageToSuperError,
			],
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super();
						this.message = message;
						this.name = 'FooError';
					}

					get message() {
						return 'Custom message';
					}
				}
			`,
			errors: [
				doNotAssignMessageWithoutSetterError,
			],
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}

					set message(message) {
						this._message = message;
					}
				}
			`,
			errors: [
				doNotPassMessageToSuperError,
			],
		},
	],
};

test(tests);
test.typescript(avoidTestTitleConflict(tests, 'typescript'));

test({
	valid: [
		// #130
		outdent`
			export class ValidationError extends Error {
				name = 'ValidationError';
				constructor(message, options) {
					super(message, options);
				}
			}
		`,
	],
	invalid: [
		// #130
		{
			code: outdent`
				export class ValidationError extends Error {
					name = 'FOO';
					constructor(message) {
						super(message);
					}
				}
			`,
			errors: [invalidNameError('ValidationError')],
		},
		// `computed`
		{
			code: outdent`
				const name = 'computed-name';
				class FooError extends Error {
					[name] = 'FooError';
					constructor(message) {
						super(message);
					}
				}
			`,
			errors: [invalidNameError('FooError')],
		},
	],
});

test.typescript({
	valid: [
		outdent`
			class CustomError extends Error {
				constructor(type: string, text: string, reply?: any);
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(message: string, options: ErrorOptions) {
					super(message, options);
					this.name = 'FooError';
				}
			}
		`,
	],
	invalid: [
		{
			code: outdent`
				export class ValidationError extends Error {
					'name': SomeType;
					constructor(message) {
						super(message);
					}
				}
			`,
			errors: [invalidNameError('ValidationError')],
		},
		{
			code: outdent`
				class FooError extends Error {
					name: string;
				}
			`,
			errors: [invalidNameError('FooError')],
			output: outdent`
				class FooError extends Error {
					name = 'FooError';
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message: string) {
						super(message);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(message: string, options: ErrorOptions) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message?: string) {
						super(message);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
			output: outdent`
				class FooError extends Error {
					constructor(message?: string, options?: ErrorOptions) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
	],
});
