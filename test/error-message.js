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
	// TODO: Check how should the last two tests work on default parserOptions
	testerOptions: {
		env: {
			es6: true
		},
		parserOptions: undefined
	},
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
		{
			code: 'throw new Error()',
			errors: [noMessageError]
		},
		{
			code: 'throw Error()',
			errors: [noMessageError]
		},
		{
			code: 'throw new Error(\'\')',
			errors: [emptyStringError]
		},
		{
			code: outdent`
			const err = new Error();
			throw err;
			`,
			errors: [noMessageError]
		},
		{
			code: outdent`
			let err = 1;
			err = new Error();
			throw err;
			`,
			errors: [noMessageError]
		},
		{
			code: outdent`
			let err = new Error();
			err = 1;
			throw err;
			`,
			errors: [noMessageError]
		}
	]
});
