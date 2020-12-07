import {outdent} from 'outdent';
import {test} from './utils/test';

test({
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
		`
	],
	invalid: [
	]
});

test.visualize([
	'throw new Error()',
	'throw Error()',
	'throw new Error(\'\')',
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
	'throw new Error(lineNumber=2)'
]);
