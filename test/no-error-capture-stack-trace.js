import outdent from 'outdent';
import {getTester} from './utils/test.js';
import builtinErrors from '../rules/shared/builtin-errors.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'class MyError {constructor() {Error.captureStackTrace(this, MyError)}}',
		'class MyError extends UnknownError {constructor() {Error.captureStackTrace(this, MyError)}}',
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
		].map(code => outdent`
			class MyError extends Error {
				constructor() {
					${code}
				}
			}
		`),
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
					${code}
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
	],
});
