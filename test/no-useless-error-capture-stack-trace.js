import outdent from 'outdent';
import builtinErrors from '../rules/shared/builtin-errors.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'class MyError {constructor() {Error.captureStackTrace(this, MyError)}}',
		'class MyError extends NotABuiltinError {constructor() {Error.captureStackTrace(this, MyError)}}',
		...[
			'',
			'Error.captureStackTrace(not_this, MyError)',
			'Error.captureStackTrace(this, NotClassName)',
			'Error.captureStackTrace(this, MyError, ...extraArguments)',
			'Error.captureStackTrace(this)',
			'Error.captureStackTrace(..._, MyError)',
			'Error.captureStackTrace(this, ..._)',
			'Error.captureStackTrace(...[this, MyError])',
			'NotError.captureStackTrace(this, MyError)',
			'Error.not_captureStackTrace(this, MyError)',
			'Error.captureStackTrace',
			'new Error.captureStackTrace(this, MyError)',
			'Error?.captureStackTrace(this, MyError)',
			'Error.captureStackTrace(this, this?.constructor)',
			'Error.captureStackTrace(this, this.notConstructor)',
			// `MetaProperty`, but not `new.target`
			'Error.captureStackTrace(this, import.meta)',
			outdent`
				function foo() {
					Error.captureStackTrace(this, MyError)
				}
			`,
		].map(code => outdent`
			class MyError extends Error {
				constructor() {
					${code}
				}
			}
		`),
		outdent`
			class MyError extends Error {
				notConstructor() {
					Error.captureStackTrace(this, MyError)
				}
			}
		`,
		outdent`
			class MyError extends Error {
				constructor() {
					function foo() {
						Error.captureStackTrace(this, MyError)
					}
				}
			}
		`,
		outdent`
			class MyError extends Error {
				constructor(MyError) {
					Error.captureStackTrace(this, MyError)
				}
			}
		`,
		outdent`
			class MyError extends Error {
				static {
					Error.captureStackTrace(this, MyError)

					function foo() {
						Error.captureStackTrace(this, MyError)
					}
				}
			}
		`,
		outdent`
			class MyError extends Error {
				constructor() {
					class NotAErrorSubclass {
						constructor() {
							Error.captureStackTrace(this, new.target)
						}
					}
				}
			}
		`,
		outdent`
			class Error {}
			class MyError extends Error {
				constructor() {
					Error.captureStackTrace(this, MyError)
				}
			}
		`,
		outdent`
			class Error {}
			class MyError extends RangeError {
				constructor() {
					Error.captureStackTrace(this, MyError)
				}
			}
		`,
		// The call runs after the constructor returned, so it does re-capture the stack
		outdent`
			class MyError extends Error {
				constructor() {
					setTimeout(() => Error.captureStackTrace(this, MyError))
				}
			}
		`,
		outdent`
			class MyError extends Error {
				constructor() {
					const foo = () => Error.captureStackTrace(this, MyError)
				}
			}
		`,
		outdent`
			class MyError extends Error {
				constructor() {
					const foo = () => {
						Error.captureStackTrace(this, MyError)
					}
				}
			}
		`,
		// An immediately invoked arrow function runs in the constructor, but it is ignored like any other arrow function
		outdent`
			class MyError extends Error {
				constructor() {
					(async () => Error.captureStackTrace(this, MyError))()
				}
			}
		`,
	],
	invalid: [
		...[
			'Error.captureStackTrace(this, MyError)',
			'Error.captureStackTrace?.(this, MyError)',
			'Error.captureStackTrace(this, this.constructor)',
			'Error.captureStackTrace?.(this, this.constructor)',
			'Error.captureStackTrace(this, new.target)',
			'Error.captureStackTrace?.(this, new.target)',
		].map(code => outdent`
			class MyError extends Error {
				constructor() {
					${code};
				}
			}
		`),
		...builtinErrors.map(builtinError => outdent`
			class MyError extends ${builtinError} {
				constructor() {
					Error.captureStackTrace(this, MyError)
				}
			}
		`),
		outdent`
			class MyError extends Error {
				constructor() {
					if (a) Error.captureStackTrace(this, MyError)
				}
			}
		`,
		outdent`
			class MyError extends Error {
				constructor() {
					void Error.captureStackTrace(this, MyError)
				}
			}
		`,
		outdent`
			export default class extends Error {
				constructor() {
					Error.captureStackTrace(this, new.target)
				}
			}
		`,
		// ClassExpression
		outdent`
			export default (
				class extends Error {
					constructor() {
						Error.captureStackTrace(this, new.target)
					}
				}
			)
		`,
	],
});

test.snapshot({
	testerOptions: {
		languageOptions: {parser: parsers.typescript},
	},
	valid: [
		outdent`
			class MyError extends Error {
				constructor(): void;
				static {
					Error.captureStackTrace(this, MyError)

					function foo() {
						Error.captureStackTrace(this, MyError)
					}
				}
			}
		`,
	],
	invalid: [],
});

// The whole statement is removed, so a comment inside it would be lost
test({
	valid: [],
	invalid: [
		{
			code: outdent`
				class MyError extends Error {
					constructor() {
						Error.captureStackTrace(/* keep */ this, MyError)
					}
				}
			`,
			errors: 1,
		},
		{
			code: outdent`
				class MyError extends Error {
					constructor() {
						Error.captureStackTrace(this, MyError) // keep
					}
				}
			`,
			output: outdent`
				class MyError extends Error {
					constructor() {
						 // keep
					}
				}
			`,
			errors: 1,
		},
	],
});
