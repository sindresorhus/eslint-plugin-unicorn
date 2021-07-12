import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const errors = [
	{
		messageId: 'prefer-dom-node-dataset',
	},
];

test({
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
		'element.setAttribute(\'data-\', \'🦄\');',
	],
	invalid: [
		{
			code: 'element.setAttribute(\'data-unicorn\', \'🦄\');',
			errors,
			output: 'element.dataset.unicorn = \'🦄\';',
		},
		{
			code: 'element.setAttribute(\'data-🦄\', \'🦄\');',
			errors,
			output: 'element.dataset[\'🦄\'] = \'🦄\';',
		},
		{
			code: 'element.setAttribute(\'data-foo2\', \'🦄\');',
			errors,
			output: 'element.dataset.foo2 = \'🦄\';',
		},
		{
			code: 'element.setAttribute(\'data-foo:bar\', \'zaz\');',
			errors,
			output: 'element.dataset[\'foo:bar\'] = \'zaz\';',
		},
		{
			code: 'element.setAttribute("data-foo:bar", "zaz");',
			errors,
			output: 'element.dataset["foo:bar"] = "zaz";',
		},
		{
			code: 'element.setAttribute(\'data-foo.bar\', \'zaz\');',
			errors,
			output: 'element.dataset[\'foo.bar\'] = \'zaz\';',
		},
		{
			code: 'element.setAttribute(\'data-foo-bar\', \'zaz\');',
			errors,
			output: 'element.dataset.fooBar = \'zaz\';',
		},
		{
			code: 'element.setAttribute(\'data-foo\', /* comment */ \'bar\');',
			errors,
			output: 'element.dataset.foo = \'bar\';',
		},
		{
			code: outdent`
				element.setAttribute(
					\'data-foo\', // comment
					\'bar\' // comment
				);
			`,
			errors,
			output: 'element.dataset.foo = \'bar\';',
		},
		{
			code: 'element.querySelector(\'#selector\').setAttribute(\'data-AllowAccess\', true);',
			errors,
			output: 'element.querySelector(\'#selector\').dataset.AllowAccess = true;',
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		outdent`
			element.setAttribute(
				\'data-foo\', // comment
				\'bar\' // comment
			);
		`,
	],
});
