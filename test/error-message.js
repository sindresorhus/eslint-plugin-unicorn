import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'throw new Error(\'error\')',
		'throw new TypeError(\'error\')',
		'throw new MyCustomError(\'error\')',
		'throw new MyCustomError()',
		'throw generateError()',
		'throw foo()',
		'throw err',
		'throw 1',
		outdent`
			const err = TypeError('error');
			throw err;
		`,
		// Should not check other argument
		'new Error("message", 0, 0)',
		// We don't know the value
		'new Error(foo)',
		'new Error(...foo)',
		// #915, not a issue anymore, we don't track `ThrowStatement`
		outdent`
			/* global x */
			const a = x;
			throw x;
		`,
		// #1431: Do not fail if Error is shadowed
		outdent`
			const Error = function () {};
			const err = new Error({
				name: 'Unauthorized',
			});
		`,
	],
	invalid: [
		'throw new Error()',
		'throw Error()',
		'throw new Error(\'\')',
		'throw new Error(``)',
		outdent`
			const err = new Error();
			throw err;
		`,
		outdent`
			let err = 1;
			err = new Error();
			throw err;
		`,
		outdent`
			let err = new Error();
			err = 1;
			throw err;
		`,
		'const foo = new TypeError()',
		'const foo = new SyntaxError()',
		outdent`
			const errorMessage = Object.freeze({errorMessage: 1}).errorMessage;
			throw new Error(errorMessage)
		`,
		'throw new Error([])',
		'throw new Error([foo])',
		'throw new Error([0][0])',
		'throw new Error({})',
		'throw new Error({foo})',
		'throw new Error({foo: 0}.foo)',
		'throw new Error(lineNumber=2)',
		'const error = new RangeError;',
		'throw Object.assign(new Error(), {foo})',
	],
});

// `AggregateError`
test.snapshot({
	valid: [
		'new AggregateError(errors, "message")',
		'new NotAggregateError(errors)',
		'new AggregateError(...foo)',
		'new AggregateError(...foo, "")',
		'new AggregateError(errors, ...foo)',
		'new AggregateError(errors, message, "")',
		'new AggregateError("", message, "")',
	],
	invalid: [
		'new AggregateError(errors)',
		'AggregateError(errors)',
		'new AggregateError(errors, "")',
		'new AggregateError(errors, ``)',
		'new AggregateError(errors, "", extraArgument)',
		outdent`
			const errorMessage = Object.freeze({errorMessage: 1}).errorMessage;
			throw new AggregateError(errors, errorMessage)
		`,
		'new AggregateError(errors, [])',
		'new AggregateError(errors, [foo])',
		'new AggregateError(errors, [0][0])',
		'new AggregateError(errors, {})',
		'new AggregateError(errors, {foo})',
		'new AggregateError(errors, {foo: 0}.foo)',
		'new AggregateError(errors, lineNumber=2)',
		'const error = new AggregateError;',
	],
});
