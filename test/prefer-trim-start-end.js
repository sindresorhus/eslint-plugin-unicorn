import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-trim-start-end';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errorTrimLeft = {
	ruleId: 'prefer-trim-start-end',
	messageId: 'trimLeft'
};

const errorTrimRight = {
	ruleId: 'prefer-trim-start-end',
	messageId: 'trimRight'
};

ruleTester.run('prefer-flat-map', rule, {
	valid: [
		'foo.trimStart()',
		'foo.trimEnd()',
		// Extra arguments
		'foo.trimLeft(1)',
		// New
		'new foo.trimLeft()',
		// Function call
		'trimLeft()',
		// Not call
		'foo.trimLeft'
	],
	invalid: [
		{
			code: 'foo.trimLeft()',
			output: 'foo.trimStart()',
			errors: [errorTrimLeft]
		},
		{
			code: 'foo.trimRight()',
			output: 'foo.trimEnd()',
			errors: [errorTrimRight]
		},
		{
			code: '"foo".trimLeft()',
			output: '"foo".trimStart()',
			errors: [errorTrimLeft]
		}
	]
});
