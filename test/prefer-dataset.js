import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-dataset';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [
	{
		ruleId: 'prefer-dataset',
		message: 'Prefer `dataset` over `setAttribute`'
	}
];

ruleTester.run('prefer-dataset', rule, {
	valid: [
		'element.dataset.unicorn = \'🦄\';',
		'element.dataset[\'unicorn\'] = \'🦄\';',
		'element[setAttribute](\'data-unicorn\', \'🦄\');',
		'element.setAttribute(\'foo\', \'bar\');'
	],
	invalid: [
		{
			code: 'element.setAttribute(\'data-unicorn\', \'🦄\');',
			errors,
			output: 'element.dataset.unicorn = \'🦄\';'
		}
	]
});
