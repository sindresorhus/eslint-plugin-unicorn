import outdent from 'outdent';
import {getTester} from './utils/test.js';

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
		'element.setAttribute(\'data-ゆ\', \'ゆ\');',
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
		// Not fixable
		'optional?.element.setAttribute("data-unicorn", "🦄");',
		'console.log(element.setAttribute("data-unicorn", "🦄"))',
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
		'element.removeAttribute("data-ゆ");',
		'element.removeAttribute("data-foo2");',
		'element.removeAttribute("data-foo:bar");',
		'element.removeAttribute("data-foo:bar");',
		'element.removeAttribute("data-foo.bar");',
		'element.removeAttribute("data-foo-bar");',
		'element.removeAttribute("data-foo");',
		'element.querySelector("#selector").removeAttribute("data-AllowAccess");',
		'element.removeAttribute("data-");',
		'optional?.element.removeAttribute("data-unicorn");',
		'element.removeAttribute("data-unicorn")?.property',
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
		'element.hasAttribute("data");',
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
		'element.hasAttribute("data-ゆ");',
		'element.hasAttribute("data-foo2");',
		'element.hasAttribute("data-foo:bar");',
		'element.hasAttribute("data-foo:bar");',
		'element.hasAttribute("data-foo.bar");',
		'element.hasAttribute("data-foo-bar");',
		'element.hasAttribute("data-foo");',
		'element.querySelector("#selector").hasAttribute("data-AllowAccess");',
		'optional?.element.hasAttribute("data-unicorn");',
		'element.hasAttribute("data-unicorn").toString()',
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
		'element.getAttribute("data");',
		// https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2307
		'await page.locator("text=Hello").getAttribute("data-foo")',
	],
	invalid: [
		outdent`
			element.getAttribute(
				"data-foo", // comment
			);
		`,
		'element.getAttribute(\'data-unicorn\');',
		'element.getAttribute("data-unicorn");',
		'element?.getAttribute("data-unicorn");',
		'element.getAttribute("data-unicorn",);',
		'element.getAttribute("data-🦄");',
		'element.getAttribute("data-ゆ");',
		'element.getAttribute("data-foo2");',
		'element.getAttribute("data-foo:bar");',
		'element.getAttribute("data-foo:bar");',
		'element.getAttribute("data-foo.bar");',
		'element.getAttribute("data-foo-bar");',
		'element.getAttribute("data-foo");',
		'element.querySelector("#selector").getAttribute("data-AllowAccess");',
		'optional?.element.getAttribute("data-unicorn");',
		'element.getAttribute("data-unicorn").toString()',
	],
});

// PreferAttributes
test.snapshot({
	valid: [
		'console.log(element.dataset);',
		'element.dataset[variable];',
		'element.dataset.foo += "bar";',
		'element.dataset.foo++;',
		'element.dataset["foo-bar"];',
		'element.dataset["foo-bar"] = "baz";',
		'delete element.dataset["foo-bar"];',
		'"foo-bar" in element.dataset',
		'Object.hasOwn(element.dataset, "foo-bar")',
		'const data = element.dataset;',
		'const {unicorn} = element?.dataset;',
	].map(code => ({code, options: [{preferAttributes: true}]})),
	invalid: [
		'element.dataset.unicorn;',
		'element.dataset.fooBar;',
		'element.dataset["foo:bar"];',
		'element.dataset[\'foo:bar\'];',
		'element?.dataset.unicorn;',
		'element.dataset.unicorn = "🦄";',
		'element.dataset.fooBar = "baz";',
		'delete element.dataset.unicorn;',
		'delete element.dataset.fooBar;',
		'"unicorn" in element.dataset',
		'\'unicorn\' in element.dataset',
		'Object.hasOwn(element.dataset, "unicorn")',
		'Object.hasOwn(element.dataset, \'unicorn\')',
		'Object.hasOwn(element.dataset, "fooBar")',
		'const {unicorn} = element.dataset;',
		'const {unicorn: myVar} = element.dataset;',
		'const {foo, bar} = element.dataset;',
		'let {foo, bar} = element.dataset;',
		// Not fixable
		'const result = element.dataset.unicorn = "🦄";',
		'if (delete element.dataset.unicorn) {}',
		'const {unicorn = "default"} = element.dataset;',
		'const {...rest} = element.dataset;',
		'const {foo, bar} = element.querySelector("#selector").dataset;',
		'for (const {foo} = element.dataset; ;) {}',
		'export const {foo} = element.dataset;',
		'element.dataset.hasOwnProperty("unicorn")',
		'element.dataset.toString()',
		'element.dataset.unicorn()',
	].map(code => ({code, options: [{preferAttributes: true}]})),
});
