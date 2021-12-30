import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// `setAttribute`
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
		// Not `setAttribute`
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
		'element.setAttribute(\'data\', \'🦄\');',
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
		'element.setAttribute("data-", "🦄");',
		'element.setAttribute("data--foo", "🦄");',
		'element.setAttribute("DATA--FOO", "🦄");',
		'element.setAttribute("DATA- ", "🦄");',
		'element.setAttribute("DATA-Foo-bar", "🦄");',
	],
});

// `removeAttribute``
test.snapshot({
	valid: [
		'delete element.dataset.unicorn;',
		'delete element.dataset["unicorn"];',
		// Not `CallExpression`
		'new element.removeAttribute("data-unicorn");',
		// Not `MemberExpression`
		'removeAttribute("data-unicorn");',
		// `callee.property` is not a `Identifier`
		'element["removeAttribute"]("data-unicorn");',
		// Computed
		'element[removeAttribute]("data-unicorn");',
		// Not `removeAttribute`
		'element.foo("data-unicorn");',
		// More or less argument(s)
		'element.removeAttribute("data-unicorn", "extra");',
		'element.removeAttribute();',
		'element.removeAttribute(...argumentsArray, ...argumentsArray2)',
		// First Argument is not `Literal`
		'element.removeAttribute(`data-unicorn`);',
		// First Argument is not `string`
		'element.removeAttribute(0);',
		// First Argument is not startsWith `data-`
		'element.removeAttribute("foo-unicorn");',
		'element.removeAttribute("data");',
	],
	invalid: [
		outdent`
			element.removeAttribute(
				"data-foo", // comment
			);
		`,
		'element.removeAttribute(\'data-unicorn\');',
		'element.removeAttribute("data-unicorn");',
		'element.removeAttribute("data-unicorn",);',
		'element.removeAttribute("data-🦄");',
		'element.removeAttribute("data-foo2");',
		'element.removeAttribute("data-foo:bar");',
		'element.removeAttribute("data-foo:bar");',
		'element.removeAttribute("data-foo.bar");',
		'element.removeAttribute("data-foo-bar");',
		'element.removeAttribute("data-foo");',
		'element.querySelector("#selector").removeAttribute("data-AllowAccess");',
		'element.removeAttribute("data-");',
	],
});
