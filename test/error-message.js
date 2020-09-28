import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/error-message';

const MESSAGE_ID_MISSING_MESSAGE = 'constructorMissingMessage';
const MESSAGE_ID_EMPTY_MESSAGE = 'emptyMessage';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const emptyStringError = {
	messageId: MESSAGE_ID_EMPTY_MESSAGE
};

const noMessageError = {
	messageId: MESSAGE_ID_MISSING_MESSAGE
};

ruleTester.run('error-message', rule, {
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
