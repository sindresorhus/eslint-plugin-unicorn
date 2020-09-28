import test from 'ava';
import {outdent} from 'outdent';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-dataset';
import visualizeRuleTester from './utils/visualize-rule-tester';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [
	{
		messageId: 'prefer-dataset'
	}
];

ruleTester.run('prefer-dataset', rule, {
	valid: [
		'element.dataset.unicorn = \'🦄\';',
		'element.dataset[\'unicorn\'] = \'🦄\';',
		// Not `CallExpression`
		'new element.setAttribute(\'data-unicorn\', \'🦄\');',
		// Not `MemberExpression`
		'setAttribute(\'data-unicorn\', \'🦄\');',
		// `callee.property` is not a `Identifier`
		'element[\'setAttribute\'](\'data-unicorn\', \'🦄\');',
		// Computed
		'element[setAttribute](\'data-unicorn\', \'🦄\');',
		// Not `appendChild`
		'element.foo(\'data-unicorn\', \'🦄\');',
		// More or less argument(s)
		'element.setAttribute(\'data-unicorn\', \'🦄\', \'extra\');',
		'element.setAttribute(\'data-unicorn\');',
		'element.setAttribute(...argumentsArray, ...argumentsArray2)',
		// First Argument is not `Literal`
		'element.setAttribute(`data-unicorn`, \'🦄\');',
		// First Argument is not `string`
		'element.setAttribute(0, \'🦄\');',
		// First Argument is not startsWith `data-`
		'element.setAttribute(\'foo-unicorn\', \'🦄\');',
		// First Argument is `data-`
		'element.setAttribute(\'data-\', \'🦄\');'
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
		},
		{
			code: 'element.querySelector(\'#selector\').setAttribute(\'data-AllowAccess\', true);',
			errors,
			output: 'element.querySelector(\'#selector\').dataset.AllowAccess = true;'
		}
	]
});

const visualizeTester = visualizeRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2021
	}
});

visualizeTester.run('no-useless-undefined', rule, [
	outdent`
		element.setAttribute(
			\'data-foo\', // comment
			\'bar\' // comment
		);
	`
]);
