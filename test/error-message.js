import {outdent} from 'outdent';
import {test} from './utils/test';

const MESSAGE_ID_MISSING_MESSAGE = 'constructorMissingMessage';
const MESSAGE_ID_EMPTY_MESSAGE = 'emptyMessage';

const emptyStringError = {
	messageId: MESSAGE_ID_EMPTY_MESSAGE
};

const noMessageError = {
	messageId: MESSAGE_ID_MISSING_MESSAGE
};

test({
	valid: [
		'throw new Error(\'error\')',
		'throw new TypeError(\'error\')',
		'throw new MyCustomError(\'error\')',
		'throw new MyCustomError()',
		'throw generateError()',
		'throw new Error(lineNumber=2)',
		'throw new Error([])',
		'throw foo()',
		'throw err',
		'throw 1',
		outdent`
			const err = TypeError('error');
			throw err;
		`
	],
	invalid: [
	],
})

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
	'const foo = new SyntaxError()'
]);
