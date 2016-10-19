import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/escape-case';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [{
	ruleId: 'escape-case',
	message: 'Use uppercase characters for escape sequences.'
}];

ruleTester.run('escape-case', rule, {
	valid: [
		'var foo = "\xA9"',
	],
	invalid: [
    {
			code: 'var foo = "\xa9"',
			errors
		}
	]
});
