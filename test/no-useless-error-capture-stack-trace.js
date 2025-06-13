import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';
import builtinErrors from '../rules/shared/builtin-errors.js';

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
	],
	invalid: [
		...[
			'Error.captureStackTrace(this, MyError)',
			'Error.captureStackTrace?.(this, MyError)',
			'Error.captureStackTrace(this, this.constructor)',
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
					const foo = () => {
						Error.captureStackTrace(this, MyError)
					}
				}
			}
		`,
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
					const x = () => Error.captureStackTrace(this, MyError)
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
		// This will be fixed when we add global reference check
		outdent`
			const Error = () => {}
			class MyError extends Error {
				constructor() {
					Error.captureStackTrace(this, MyError)
				}
			}
		`,
		// This will be fixed when we add global reference check
		outdent`
			const Error = () => {}
			class MyError extends RangeError {
				constructor() {
					Error.captureStackTrace(this, MyError)
				}
			}
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
