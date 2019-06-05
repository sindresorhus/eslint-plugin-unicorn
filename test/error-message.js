import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/error-message';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const emptyStringError = {
	ruleId: 'error-message',
	message: 'Error message should not be an empty string.'
};

const noMessageError = {
	ruleId: 'error-message',
	message: 'Pass a message to the error constructor.'
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
		`const err = TypeError('error');
		 throw err;`
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
			code: `
			const err = new Error();
			throw err;
			`,
			errors: [noMessageError]
		},
		{
			code: `
			let err = 1;
			err = new Error();
			throw err;
			`,
			errors: [noMessageError]
		},
		{
			code: `
			let err = new Error();
			err = 1;
			throw err;
			`,
			errors: [noMessageError]
		}
	]
});
