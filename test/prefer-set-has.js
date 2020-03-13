import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import outdent from 'outdent';
import rule from '../rules/prefer-set-has';

const ruleId = 'prefer-set-has';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

const createError = name => [
	{
		messageId: ruleId,
		data: {
			name,
		}
	}
];

ruleTester.run(ruleId, rule, {
	valid: [
	],
	invalid: [
		{
			code: outdent`
				const foo = ['1', '2', '3'];
				if (foo.includes('1')) {}
			`,
			// output: outdent``,
			errors: [createError('foo2')]
		}
	]
});
