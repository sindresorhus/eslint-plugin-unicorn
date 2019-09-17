import test from 'ava';
import {outdent} from 'outdent';
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
		message: 'Prefer `.dataset` over `setAttribute(…)`.'
	}
];

ruleTester.run('prefer-dataset', rule, {
	valid: [
		'element.dataset.unicorn = \'🦄\';',
		'element.dataset[\'unicorn\'] = \'🦄\';',
		'element[setAttribute](\'data-unicorn\', \'🦄\');',
		'element.setAttribute(\'foo\', \'bar\');',
		'element.setAttribute(foo, bar);',
		'element.getAttribute(\'data-unicorn\');'
	],
	invalid: [
		{
			code: 'element.setAttribute(\'data-unicorn\', \'🦄\');',
			errors,
			output: 'element.dataset.unicorn = \'🦄\';'
		},
		{
			code: 'element.setAttribute(\'data-🦄\', \'🦄\');',
			errors,
			output: 'element.dataset[\'🦄\'] = \'🦄\';'
		},
		{
			code: 'element.setAttribute(\'data-foo2\', \'🦄\');',
			errors,
			output: 'element.dataset.foo2 = \'🦄\';'
		},
		{
			code: 'element.setAttribute(\'data-foo:bar\', \'zaz\');',
			errors,
			output: 'element.dataset[\'foo:bar\'] = \'zaz\';'
		},
		{
			code: 'element.setAttribute(\'data-foo.bar\', \'zaz\');',
			errors,
			output: 'element.dataset[\'foo.bar\'] = \'zaz\';'
		},
		{
			code: 'element.setAttribute(\'data-foo-bar\', \'zaz\');',
			errors,
			output: 'element.dataset.fooBar = \'zaz\';'
		},
		{
			code: 'element.setAttribute(\'data-foo\', /* comment */ \'bar\');',
			errors,
			output: 'element.dataset.foo = \'bar\';'
		},
		{
			code: outdent`
				element.setAttribute(
					\'data-foo\', // comment
					\'bar\' // comment
				);
			`,
			errors,
			output: 'element.dataset.foo = \'bar\';'
		}
	]
});
