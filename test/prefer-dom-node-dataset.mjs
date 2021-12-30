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
		// First Argument is `data-`
		'element.removeAttribute("data-");',
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
	],
});

// `hasAttribute``
test.snapshot({
	valid: [
		'"unicorn" in element.dataset',
		'element.dataset.hasOwnProperty("unicorn")',
		'Object.prototype.hasOwnProperty.call(element.dataset, "unicorn")',
		'Object.hasOwn(element.dataset, "unicorn")',
		'Reflect.has(element.dataset, "unicorn")',
		// Not `CallExpression`
		'new element.hasAttribute("data-unicorn");',
		// Not `MemberExpression`
		'hasAttribute("data-unicorn");',
		// `callee.property` is not a `Identifier`
		'element["hasAttribute"]("data-unicorn");',
		// Computed
		'element[hasAttribute]("data-unicorn");',
		// Not `removeAttribute`
		'element.foo("data-unicorn");',
		// More or less argument(s)
		'element.hasAttribute("data-unicorn", "extra");',
		'element.hasAttribute();',
		'element.hasAttribute(...argumentsArray, ...argumentsArray2)',
		// First Argument is not `Literal`
		'element.hasAttribute(`data-unicorn`);',
		// First Argument is not `string`
		'element.hasAttribute(0);',
		// First Argument is not startsWith `data-`
		'element.hasAttribute("foo-unicorn");',
		// First Argument is `data-`
		'element.hasAttribute("data-");',
	],
	invalid: [
		outdent`
			element.hasAttribute(
				"data-foo", // comment
			);
		`,
		'element.hasAttribute(\'data-unicorn\');',
		'element.hasAttribute("data-unicorn");',
		'element.hasAttribute("data-unicorn",);',
		'element.hasAttribute("data-🦄");',
		'element.hasAttribute("data-foo2");',
		'element.hasAttribute("data-foo:bar");',
		'element.hasAttribute("data-foo:bar");',
		'element.hasAttribute("data-foo.bar");',
		'element.hasAttribute("data-foo-bar");',
		'element.hasAttribute("data-foo");',
		'element.querySelector("#selector").hasAttribute("data-AllowAccess");',
	],
});

// `getAttribute``
test.snapshot({
	valid: [
		'element.dataset.unicorn',
		// Not `CallExpression`
		'new element.getAttribute("data-unicorn");',
		// Not `MemberExpression`
		'getAttribute("data-unicorn");',
		// `callee.property` is not a `Identifier`
		'element["getAttribute"]("data-unicorn");',
		// Computed
		'element[getAttribute]("data-unicorn");',
		// Not `getAttribute`
		'element.foo("data-unicorn");',
		// More or less argument(s)
		'element.getAttribute("data-unicorn", "extra");',
		'element.getAttribute();',
		'element.getAttribute(...argumentsArray, ...argumentsArray2)',
		// First Argument is not `Literal`
		'element.getAttribute(`data-unicorn`);',
		// First Argument is not `string`
		'element.getAttribute(0);',
		// First Argument is not startsWith `data-`
		'element.getAttribute("foo-unicorn");',
		// First Argument is `data-`
		'element.getAttribute("data-");',
	],
	invalid: [
		outdent`
			element.getAttribute(
				"data-foo", // comment
			);
		`,
		'element.getAttribute(\'data-unicorn\');',
		'element.getAttribute("data-unicorn");',
		'element.getAttribute("data-unicorn",);',
		'element.getAttribute("data-🦄");',
		'element.getAttribute("data-foo2");',
		'element.getAttribute("data-foo:bar");',
		'element.getAttribute("data-foo:bar");',
		'element.getAttribute("data-foo.bar");',
		'element.getAttribute("data-foo-bar");',
		'element.getAttribute("data-foo");',
		'element.querySelector("#selector").getAttribute("data-AllowAccess");',
	],
});
