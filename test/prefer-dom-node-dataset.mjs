import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
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
		outdent`
			element.setAttribute(
				\'data-foo\', // comment
				\'bar\' // comment
			);
		`,
		'element.setAttribute(\'data-unicorn\', \'🦄\');',
		'element.setAttribute(\'data-🦄\', \'🦄\');',
		'element.setAttribute(\'data-foo2\', \'🦄\');',
		'element.setAttribute(\'data-foo:bar\', \'zaz\');',
		'element.setAttribute("data-foo:bar", "zaz");',
		'element.setAttribute(\'data-foo.bar\', \'zaz\');',
		'element.setAttribute(\'data-foo-bar\', \'zaz\');',
		'element.setAttribute(\'data-foo\', /* comment */ \'bar\');',
		'element.querySelector(\'#selector\').setAttribute(\'data-AllowAccess\', true);',
	],
});
