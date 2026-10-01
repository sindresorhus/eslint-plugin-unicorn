import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, avoidTestTitleConflict} from './utils/test.js';

const {test: ruleTest, rule} = getTester(import.meta);

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
		// `options` is already forwarded inline, so a dedicated parameter is not needed
		outdent`
			class FooError extends Error {
				constructor(message) {
					super('Fixed message', {cause: message});
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends Error {
				name = 'FooError';
				constructor(message, options) {
					super(message, {cause: options.cause});
				}
			}
		`,
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
			exports['FooError'] = class FooError extends Error {
				constructor(message, options) {
					super(message, options);
					this.name = 'FooError';
				}
			};
		`,
		outdent`
			const exportName = 'FooError';
			exports[exportName] = class FooError extends Error {
				constructor(message, options) {
					super(message, options);
					this.name = 'FooError';
				}
			};
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
		// Inline options with a hard-coded message provided as a no-substitution template literal
		outdent`
			class FooError extends Error {
				constructor(cause) {
					super(\`The request timed out\`, {cause});
					this.name = 'FooError';
				}
			}
		`,
		// Inline options forwarded to a custom `*Error` superclass (the reported real-world case)
		outdent`
			class TimeoutError extends FetchError {
				constructor(cause) {
					super('The request timed out', {cause});
					this.name = 'TimeoutError';
				}
			}
		`,
		// The second argument of a custom error base class is not necessarily `ErrorOptions`
		outdent`
			class UserNotFoundError extends GraphQLError {
				constructor(userId) {
					super(\`User "\${userId}" does not exist\`, {extensions: {code: 'NOT_FOUND'}});
					this.name = 'UserNotFoundError';
				}
			}
		`,
		outdent`
			class FooError extends GraphQLError {
				constructor(message, extensions) {
					super(message, extensions);
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends GraphQLError {
				constructor(message, details) {
					super(message);
					this.details = details;
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends Custom.Error {
				constructor(message) {
					super(message);
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends AggregateError {
				constructor(errors, message, options) {
					super(errors, message, options);
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends SuppressedError {
				constructor(error, suppressed, message) {
					super(error, suppressed, message);
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends globalThis.AggregateError {
				constructor(errors, message, options) {
					super(errors, message, options);
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
		// No-substitution template literal for `name` is equivalent to a string literal
		outdent`
			class FooError extends Error {
				constructor(message, options) {
					super(message, options);
					this.name = \`FooError\`;
				}
			}
		`,
		outdent`
			class FooError extends Error {
				name = \`FooError\`;
				constructor(message, options) {
					super(message, options);
				}
			}
		`,
		outdent`
			class FooError extends Error {
				name = \`FooError\`;
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
					constructor(message, options) {
						this.message = message;
						super(message, options);
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
					constructor(message, options) {
						super(message);
						this.message = message; /* Keep this attached */
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
					constructor(message, options) {
						super(message /* Keep this attached */);
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
					constructor(message, options) {
						super((message));
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
		// A no-substitution template literal whose value does not match the class name is still reported
		{
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.name = \`foo\`;
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
					name = \`foo\`;
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
		// A template literal with a substitution is not a static string and is still reported
		{
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super(message);
						this.name = \`\${'FooError'}\`;
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
					name = \`\${'FooError'}\`;
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
				exports['fooError'] = class FooError extends Error {
					constructor(error, options) {
						super(error, options);
						this.name = 'FooError';
					}
				};
			`,
			errors: [invalidExportError],
			output: outdent`
				exports['FooError'] = class FooError extends Error {
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
		// The inline `cause` has nothing to do with the caller's `options`, so `options` is not forwarded
		{
			code: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super('Fixed message', {cause: new TypeError('other')});
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passMessageArgumentToSuperError,
			],
		},
		// Only `cause` is forwarded, the caller's `options` is dropped
		{
			code: outdent`
				class FooError extends Error {
					constructor(message) {
						super(message, {cause});
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
						super(message /* Preserve this note */);
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
					constructor(message, options) {
						super((message));
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
						super((undefined), options);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passMessageArgumentToSuperError,
			],
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message, options) {
						super(undefined /* Preserve this note */, options);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passMessageArgumentToSuperError,
			],
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
						super(undefined /* Preserve this note */);
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
			code: outdent`
				class FooError extends globalThis.Error {
					constructor(message, details) {
						super(message, details);
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				invalidOptionsParameterError,
			],
		},
		{
			code: outdent`
				class FooError extends TypeError {
					constructor(message, details) {
						super(message, details);
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
					constructor() {
						super ( );
						this.message = foo.error;
						this.name = 'FooError';
					}
				}
			`,
			errors: [
				passMessageToSuperError,
			],
			output: outdent`
				class FooError extends Error {
					constructor() {
						super (foo.error );
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor() {
						super();
						// Explain why this message is customized.
						this.message = foo.error;
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

ruleTest(tests);
ruleTest.typescript(avoidTestTitleConflict(tests, 'typescript'));

ruleTest({
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

ruleTest.typescript({
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
		outdent`
			class UserNotFoundError extends GraphQLError {
				constructor(userId: string) {
					super(\`User "\${userId}" does not exist\`, {extensions: {code: 'NOT_FOUND'}});
					this.name = 'UserNotFoundError';
				}
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(message: string, public readonly options: ErrorOptions) {
					super(message, options);
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(message: string, public options: ErrorOptions = {}) {
					super(message, options);
					this.name = 'FooError';
				}
			}
		`,
		outdent`
			class FooError extends Error {
				name = 'FooError' as const;
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(message: string, options: ErrorOptions) {
					super(message!, options!);
					this.name = 'FooError' as const;
				}
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(cause: unknown) {
					super('Fixed message' as string, ({cause} as ErrorOptions));
					this.name = 'FooError' as const;
				}
			}
		`,
		outdent`
			class FooError extends Error {
				constructor(cause: unknown) {
					super('Fixed message' satisfies string, ({cause} satisfies ErrorOptions));
					this.name = 'FooError' as const;
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
				exports[('fooError' as const)] = class FooError extends Error {
					constructor(message, options) {
						super(message, options);
						this.name = 'FooError';
					}
				};
			`,
			errors: [invalidExportError],
			output: outdent`
				exports[('FooError' as const)] = class FooError extends Error {
					constructor(message, options) {
						super(message, options);
						this.name = 'FooError';
					}
				};
			`,
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
					name = ('Wrong' /* Keep this note */ as const);
				}
			`,
			errors: [invalidNameError('FooError')],
			output: outdent`
				class FooError extends Error {
					name = ('FooError' /* Keep this note */ as const);
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
		{
			code: outdent`
				class FooError extends (globalThis.Error as typeof Error) {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`,
			errors: [missingOptionsParameterError],
			output: outdent`
				class FooError extends (globalThis.Error as typeof Error) {
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
					constructor(message: string) {
						super(undefined as string);
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
					constructor(message: string) {
						super((message as string));
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
					constructor(message: string) {
						super(undefined /* Preserve this note */ as string);
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
					constructor(message: string) {
						super(message satisfies string);
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
						super(message satisfies string, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends Error {
					constructor(message: string) {
						super(<string>message);
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
						super(<string>message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class ParameterPropertyError extends Error {
					constructor(public readonly requestId: string) {
						super(\`Result for id "\${requestId}" does not exist\`);
						this.name = 'ParameterPropertyError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
			output: outdent`
				class ParameterPropertyError extends Error {
					constructor(public readonly requestId: string, options: ErrorOptions) {
						super(\`Result for id "\${requestId}" does not exist\`, options);
						this.name = 'ParameterPropertyError';
					}
				}
			`,
		},
		{
			code: outdent`
				class ParameterPropertyError extends Error {
					constructor(public readonly requestId: string, options: ErrorOptions) {
						super(\`Result for id "\${requestId}" does not exist\`, options);
					}
				}
			`,
			errors: [
				invalidNameError('ParameterPropertyError'),
			],
		},
		{
			code: outdent`
				class ParameterPropertyError extends Error {
					constructor(public readonly requestId: string /* Request ID */) {
						super(\`Result for id "\${requestId}" does not exist\`);
						this.name = 'ParameterPropertyError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
		},
		{
			code: outdent`
				class ParameterPropertyError extends Error {
					constructor(message: string, public readonly options: ErrorOptions) {
						super(message);
						this.name = 'ParameterPropertyError';
					}
				}
			`,
			errors: [
				passOptionsToSuperError,
			],
			output: outdent`
				class ParameterPropertyError extends Error {
					constructor(message: string, public readonly options: ErrorOptions) {
						super(message, options);
						this.name = 'ParameterPropertyError';
					}
				}
			`,
		},
		{
			code: outdent`
				class ParameterPropertyError extends Error {
					constructor(public message: string) {
						super(message!);
						this.message = message;
						this.name = 'ParameterPropertyError';
					}
				}
			`,
			errors: [
				passMessageToSuperError,
			],
			output: outdent`
				class ParameterPropertyError extends Error {
					constructor(public message: string, options: ErrorOptions) {
						super(message!, options);
						this.name = 'ParameterPropertyError';
					}
				}
			`,
		},
		{
			code: outdent`
				class ParameterPropertyError extends Error {
					constructor(message: string, options: ErrorOptions) {
						super(message);
						this.message = /* Preserve this note */ message!;
						this.name = 'ParameterPropertyError';
					}
				}
			`,
			errors: [
				passMessageToSuperError,
			],
		},
		{
			code: outdent`
				class ParameterPropertyError extends Error {
					constructor(public message: string /* Message */) {
						super();
						this.message = message;
						this.name = 'ParameterPropertyError';
					}
				}
			`,
			errors: [
				passMessageToSuperError,
			],
		},
		{
			code: outdent`
				class ParameterPropertyError extends Error {
					constructor(public readonly requestId?: string) {
						super(\`Result for id "\${requestId}" does not exist\`);
						this.name = 'ParameterPropertyError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
			output: outdent`
				class ParameterPropertyError extends Error {
					constructor(public readonly requestId?: string, options?: ErrorOptions) {
						super(\`Result for id "\${requestId}" does not exist\`, options);
						this.name = 'ParameterPropertyError';
					}
				}
			`,
		},
		{
			code: outdent`
				class ParameterPropertyError extends Error {
					constructor(public readonly requestId: string = 'unknown') {
						super(\`Result for id "\${requestId}" does not exist\`);
						this.name = 'ParameterPropertyError';
					}
				}
			`,
			errors: [
				missingOptionsParameterError,
			],
			output: outdent`
				class ParameterPropertyError extends Error {
					constructor(public readonly requestId: string = 'unknown', options: ErrorOptions) {
						super(\`Result for id "\${requestId}" does not exist\`, options);
						this.name = 'ParameterPropertyError';
					}
				}
			`,
		},
		{
			code: outdent`
				class ParameterPropertyError extends Error {
					constructor(public options: ErrorOptions) {
						super();
						this.name = 'ParameterPropertyError';
					}
				}
			`,
			errors: [
				passOptionsToSuperError,
			],
			output: outdent`
				class ParameterPropertyError extends Error {
					constructor(public options: ErrorOptions) {
						super(undefined, options);
						this.name = 'ParameterPropertyError';
					}
				}
			`,
		},
		{
			code: outdent`
				class ParameterPropertyError extends Error {
					constructor(public message: string) {
						super();
						this.message = message;
						this.name = 'ParameterPropertyError';
					}
				}
			`,
			errors: [
				passMessageToSuperError,
			],
			output: outdent`
				class ParameterPropertyError extends Error {
					constructor(public message: string, options: ErrorOptions) {
						super(message, options);
						this.name = 'ParameterPropertyError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends (Error satisfies typeof Error) {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`,
			errors: [missingOptionsParameterError],
			output: outdent`
				class FooError extends (Error satisfies typeof Error) {
					constructor(message, options) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class ParameterPropertyError extends Error {
					constructor(message: string, public readonly details: ErrorOptions) {
						super(message, details);
						this.name = 'ParameterPropertyError';
					}
				}
			`,
			errors: [
				invalidOptionsParameterError,
			],
		},
		{
			code: outdent`
				class OverloadedError extends Error {
					constructor(message: string);
					constructor(message: string, options?: ErrorOptions) {
						super(message);
						this.name = 'OverloadedError';
					}
				}
			`,
			errors: [
				passOptionsToSuperError,
			],
			output: outdent`
				class OverloadedError extends Error {
					constructor(message: string);
					constructor(message: string, options?: ErrorOptions) {
						super(message, options);
						this.name = 'OverloadedError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends (Error!) {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`,
			errors: [missingOptionsParameterError],
			output: outdent`
				class FooError extends (Error!) {
					constructor(message, options) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: outdent`
				class FooError extends (<typeof Error>Error) {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				}
			`,
			errors: [missingOptionsParameterError],
			output: outdent`
				class FooError extends (<typeof Error>Error) {
					constructor(message, options) {
						super(message, options);
						this.name = 'FooError';
					}
				}
			`,
		},
		{
			code: 'class FooError extends (GraphQLError as typeof GraphQLError) { name = \'WrongError\'; }',
			errors: [invalidNameError('FooError')],
			output: 'class FooError extends (GraphQLError as typeof GraphQLError) { name = \'FooError\'; }',
		},
		{
			code: outdent`
				exports.fooError = class FooError extends (GraphQLError as typeof GraphQLError) {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				};
			`,
			errors: [invalidExportError],
			output: outdent`
				exports.FooError = class FooError extends (GraphQLError as typeof GraphQLError) {
					constructor(message) {
						super(message);
						this.name = 'FooError';
					}
				};
			`,
		},
	],
});

// `options` may appear in any non-rest constructor parameter position, but must be the second `super()` argument.
ruleTest({
	valid: [
		'class ApiError extends Error { constructor(status, message, options) { super(message, options); this.name = \'ApiError\'; } }',
		outdent`
			class HttpError extends Error {
				constructor(response, request, options) {
					super(\`Request failed: \${request.method} \${request.url}\`, options);
					this.name = 'HttpError';
				}
			}
		`,
		'class FooError extends Error { constructor(status, options, message) { super(message, options); this.name = \'FooError\'; } }',
		'class FooError extends Error { constructor(status, message, options = {}) { super(message, options); this.name = \'FooError\'; } }',
		'class FooError extends Error { constructor(options, status, message) { super(message, options); this.name = \'FooError\'; } }',
	],
	invalid: [
		{
			code: 'class FooError extends Error { constructor(status, message, options) { super(message); this.name = \'FooError\'; } }',
			errors: [passOptionsToSuperError],
			output: 'class FooError extends Error { constructor(status, message, options) { super(message, options); this.name = \'FooError\'; } }',
		},
		{
			code: 'class FooError extends Error { constructor(status, options, message) { super(message); this.name = \'FooError\'; } }',
			errors: [passOptionsToSuperError],
			output: 'class FooError extends Error { constructor(status, options, message) { super(message, options); this.name = \'FooError\'; } }',
		},
		{
			code: 'class FooError extends Error { constructor(status, message, options) { super(); this.name = \'FooError\'; } }',
			errors: [passOptionsToSuperError],
			output: 'class FooError extends Error { constructor(status, message, options) { super(undefined, options); this.name = \'FooError\'; } }',
		},
		{
			code: 'class FooError extends Error { constructor(message, status, options) { super(); this.name = \'FooError\'; } }',
			errors: [passMessageArgumentToSuperError],
			output: 'class FooError extends Error { constructor(message, status, options) { super(message, options); this.name = \'FooError\'; } }',
		},
		{
			code: 'class FooError extends Error { constructor(status, message, options) { super(message, status); this.name = \'FooError\'; } }',
			errors: [passOptionsToSuperError],
		},
		{
			code: 'class FooError extends Error { constructor(status, message, options) { super(message, undefined, options); this.name = \'FooError\'; } }',
			errors: [passOptionsToSuperError],
		},
		{
			code: 'class FooError extends Error { constructor(status, message, options) { super(options); this.name = \'FooError\'; } }',
			errors: [passOptionsToSuperError],
		},
		{
			code: 'class FooError extends Error { constructor(status, message, ...options) { super(message, options); this.name = \'FooError\'; } }',
			errors: [invalidOptionsParameterError],
		},
		{
			code: 'class FooError extends Error { constructor(status, message, opts) { super(message, opts); this.name = \'FooError\'; } }',
			errors: [{
				...invalidOptionsParameterError,
				column: 32,
				endColumn: 43,
			}],
		},
		{
			code: 'class FooError extends Error { constructor(status, message, options) { super(message /* Preserve this note */); this.name = \'FooError\'; } }',
			errors: [passOptionsToSuperError],
		},
		{
			code: 'class FooError extends Error { constructor(options, status, message) { super(options); this.name = \'FooError\'; } }',
			errors: [passOptionsToSuperError],
		},
		{
			code: 'class FooError extends Error { constructor(status, message, options) { super(); this.message = message; this.name = \'FooError\'; } }',
			errors: [passMessageToSuperError],
			output: 'class FooError extends Error { constructor(status, message, options) { super(message); this.name = \'FooError\'; } }',
		},
		{
			code: 'const options = {}; class FooError extends Error { constructor(message) { super(message, options); this.name = \'FooError\'; } }',
			errors: [missingOptionsParameterError],
		},
	],
});

ruleTest.typescript({
	valid: [
		'class FooError extends Error { constructor(status: number, message: string, options?: ErrorOptions) { super(message, options); this.name = \'FooError\'; } }',
	],
	invalid: [
		{
			code: 'class FooError extends Error { constructor(status: number, message: string, public readonly options: ErrorOptions) { super(message); this.name = \'FooError\'; } }',
			errors: [passOptionsToSuperError],
			output: 'class FooError extends Error { constructor(status: number, message: string, public readonly options: ErrorOptions) { super(message, options); this.name = \'FooError\'; } }',
		},
		{
			code: 'class FooError extends Error { constructor(status: number, public options: ErrorOptions, message: string) { super(message); this.name = \'FooError\'; } }',
			errors: [passOptionsToSuperError],
			output: 'class FooError extends Error { constructor(status: number, public options: ErrorOptions, message: string) { super(message, options); this.name = \'FooError\'; } }',
		},
	],
});

test('forwards options after fixing the message assignment in multiple passes', t => {
	const linter = new Linter();
	const result = linter.verifyAndFix('class FooError extends Error { constructor(status, message, options) { super(); this.message = message; this.name = \'FooError\'; } }', {
		plugins: {
			test: {
				rules: {
					'custom-error-definition': rule,
				},
			},
		},
		rules: {
			'test/custom-error-definition': 'error',
		},
	});

	t.is(result.output, 'class FooError extends Error { constructor(status, message, options) { super(message, options); this.name = \'FooError\'; } }');
	t.deepEqual(result.messages, []);
});

const fixCode = code => {
	const linter = new Linter();
	return linter.verifyAndFix(code, {
		plugins: {
			test: {
				rules: {
					'custom-error-definition': rule,
				},
			},
		},
		rules: {
			'test/custom-error-definition': 'error',
		},
	});
};

test('inserts the name property with the line ending and indentation of the file', t => {
	t.is(fixCode('class FooError extends Error {\r\n}').output, 'class FooError extends Error {\r\n\tname = \'FooError\';\r\n}');
	t.is(fixCode('class FooError extends Error {\n}').output, 'class FooError extends Error {\n\tname = \'FooError\';\n}');
	t.is(fixCode('class FooError extends Error {}').output, 'class FooError extends Error {\n\tname = \'FooError\';\n}');
	t.is(
		fixCode('class FooError extends Error {\n  bar() {}\n}').output,
		'class FooError extends Error {\n  name = \'FooError\';\n  bar() {}\n}',
	);
});

// A `globalThis` error base gets the options too
ruleTest({
	valid: [],
	invalid: [
		{
			code: outdent`
				class MyError extends Error {
					name = 'MyError';
					constructor(message) {
						super(message);
					}
				}
			`,
			output: outdent`
				class MyError extends Error {
					name = 'MyError';
					constructor(message, options) {
						super(message, options);
					}
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				class MyError extends globalThis.Error {
					name = 'MyError';
					constructor(message) {
						super(message);
					}
				}
			`,
			output: outdent`
				class MyError extends globalThis.Error {
					name = 'MyError';
					constructor(message, options) {
						super(message, options);
					}
				}
			`,
			errors: 1,
		},
	],
});

test('keeps the closing brace of an empty class body at the class indentation', t => {
	t.is(fixCode('if (a) {\n\tclass FooError extends Error {}\n}').output, 'if (a) {\n\tclass FooError extends Error {\n\t\tname = \'FooError\';\n\t}\n}');
});

// `super()` forwards the `cause` of the `options` parameter
ruleTest({
	valid: [
		'class FooError extends Error { name = \'FooError\'; constructor(message, options = {}) { super(message, {cause: options.cause}); } }',
		'class FooError extends Error { name = \'FooError\'; constructor(message, options) { super(message, {cause: options?.cause}); } }',
		// A fixed message with an inline cause needs no `options` parameter, even with more parameters
		'class FooError extends Error { name = \'FooError\'; constructor(code, cause) { super(\'Fixed message\', {cause}); } }',
	],
	invalid: [
		// The `options` object itself is not its `cause`
		{
			code: 'class FooError extends Error { name = \'FooError\'; constructor(message, options) { super(message, {cause: options}); } }',
			errors: [passOptionsToSuperError],
		},
		{
			code: 'class FooError extends Error { name = \'FooError\'; constructor(message, options) { super(message, {cause: other.cause}); } }',
			errors: [passOptionsToSuperError],
		},
		// Forwarding the cause does not exempt the message
		{
			code: 'class FooError extends Error { name = \'FooError\'; constructor(message, options) { super(\'Fixed\', {cause: options.cause}); } }',
			errors: [passMessageArgumentToSuperError],
		},
	],
});

ruleTest.typescript({
	valid: [
		'class FooError extends Error { name = \'FooError\'; constructor(message: string, options?: ErrorOptions) { super(message, {cause: options?.cause}); } }',
		'class FooError extends Error { name = \'FooError\'; constructor(message: string, private readonly options: ErrorOptions) { super(message, {cause: options.cause}); } }',
	],
	invalid: [],
});
