import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

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
		{
			code: 'interface Locator {setAttribute(name: string, value: string): void} declare const locator: Locator; locator.setAttribute("data-unicorn", "value");',
			languageOptions: {parser: parsers.typescript},
		},
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
		'(a + b).setAttribute("data-unicorn", "🦄");',
		'element.setAttribute("data-unicorn", (a, b));',
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
		'(a + b).removeAttribute("data-unicorn");',
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
		'await page.locator("text=Hello")?.getAttribute("data-foo")',
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
		// Destructuring-assignment targets are writes with no `setAttribute`/`getAttribute` equivalent
		'[element.dataset.fooBar] = array;',
		'({a: element.dataset.fooBar} = object);',
		'[element.dataset.fooBar = 1] = array;',
		'[...element.dataset.fooBar] = array;',
		'({...element.dataset.fooBar} = object);',
		'element.dataset["foo-bar"];',
		'element.dataset["foo-bar"] = "baz";',
		'delete element.dataset["foo-bar"];',
		'"foo-bar" in element.dataset',
		'Object.hasOwn(element.dataset, "foo-bar")',
		'element.dataset.hasOwnProperty("foo-bar")',
		// Whole-object reads that are not bound to a variable, or whose binding is
		// optional-chained (`element?.dataset`), are not flagged.
		'foo(element.dataset);',
		'const data = element?.dataset; foo(data.fooBar);',
		'const {unicorn} = element?.dataset;',
		'"unicorn" in element?.dataset',
		'Object.hasOwn(element?.dataset, "unicorn")',
		'element.dataset.toString;',
		'element.dataset.toString();',
		'element.dataset.valueOf();',
		'element.dataset.unicorn();',
		'element.dataset.foo`bar`;',
		'element.dataset["toString"];',
		'element.dataset[\'hasOwnProperty\'];',
		'element.dataset["toString"] = x;',
		'delete element.dataset["__proto__"];',
		'const {toString} = element.dataset;',
		'const {hasOwnProperty} = element.dataset;',
		'const {toString, valueOf} = element.dataset;',
		'const {unicorn, toString} = element.dataset;',
		'const {"toString": x} = element.dataset;',
		'const {["toString"]: x} = element.dataset;',
		'const {"foo-bar": x} = element.dataset;',
		'const {["foo-bar"]: x} = element.dataset;',
		'const {[someVar]: x} = element.dataset;',
		'const {[Symbol.iterator]: x} = element.dataset;',
		'"toString" in element.dataset',
		'"__proto__" in element.dataset',
		'Object.hasOwn(element.dataset, "toString")',
		'element.dataset.hasOwnProperty("toString")',
		'element.dataset?.foo;',
		'element.dataset?.["foo"];',
		'delete element.dataset?.foo;',
		'element.dataset[" foo"];',
		'element.dataset["foo bar"] = "x";',
		'"foo bar" in element.dataset',
		'Object.hasOwn(element.dataset, "foo bar")',
		'element.dataset.hasOwnProperty("foo bar")',
		'const {" foo": x} = element.dataset;',
	].map(code => ({code, options: [{preferAttributes: true}]})),
	invalid: [
		'element.dataset.unicorn;',
		// Computed string-key read
		'element.dataset["unicorn"];',
		'element.dataset.fooBar;',
		'element.dataset["foo:bar"];',
		'element.dataset[\'foo:bar\'];',
		'element?.dataset.unicorn;',
		'element.dataset.unicorn = "🦄";',
		'element.dataset.fooBar = "baz";',
		// A default value is a read on the right of an assignment pattern, so it is still fixable
		'function f(x = element.dataset.fooBar) {}',
		'const [y = element.dataset.fooBar] = array;',
		'delete element.dataset.unicorn;',
		'delete element.dataset.fooBar;',
		'"unicorn" in element.dataset',
		'\'unicorn\' in element.dataset',
		'Object.hasOwn(element.dataset, "unicorn")',
		'Object.hasOwn(element.dataset, \'unicorn\')',
		'Object.hasOwn(element.dataset, "fooBar")',
		'element.dataset.hasOwnProperty("unicorn")',
		'element.dataset.hasOwnProperty(\'unicorn\')',
		'element.dataset.hasOwnProperty("fooBar")',
		'element?.dataset.hasOwnProperty("unicorn")',
		'delete element?.dataset.unicorn;',
		'delete element?.dataset["unicorn"];',
		'delete element?.dataset.fooBar;',
		'delete (a + b)?.dataset.unicorn;',
		'(a + b).dataset.unicorn;',
		'(a + b).dataset.unicorn = "🦄";',
		'delete (a + b).dataset.unicorn;',
		'"unicorn" in (a + b).dataset',
		'Object.hasOwn((a + b).dataset, "unicorn")',
		'(a + b).dataset.hasOwnProperty("unicorn")',
		'const {unicorn} = (a + b).dataset;',
		'({}).dataset.unicorn;',
		'element.dataset.foo = (a, b);',
		'foo()\ndelete (a + b).dataset.unicorn;',
		'foo()\n"unicorn" in (a + b).dataset',
		'foo()\nObject.hasOwn((a + b).dataset, "unicorn")',
		'const {unicorn} = element.dataset;',
		'const {unicorn: myVar} = element.dataset;',
		'const {foo, bar} = element.dataset;',
		'let {foo, bar} = element.dataset;',
		// `.dataset` assigned to a variable then read through it
		'const data = element.dataset; console.log(data.fooBar); console.log(data.bazQux);',
		'const data = element.dataset; foo(data.fooBar);',
		'const data = element.dataset; foo(data["fooBar"]);',
		'const data = element.dataset; foo(data.foo.length);',
		// The same key read more than once is rewritten at each occurrence
		'const data = element.dataset; foo(data.fooBar); bar(data.fooBar);',
		// A nested usage where the element is not shadowed is still safe to inline
		'const data = element.dataset; function inner() { foo(data.fooBar); }',
		// Reported, but not fixed
		'const data = element.dataset;',
		'let data = element.dataset; foo(data.fooBar);',
		'var data = element.dataset; foo(data.fooBar);',
		'const data = element.dataset; data.foo = "x";',
		'const data = element.dataset; delete data.foo;',
		'const data = element.dataset; data.foo++;',
		// Destructuring-assignment targets are writes, not reads (would be invalid as `getAttribute(…)`)
		'const data = element.dataset; [data.foo] = ["x"];',
		'const data = element.dataset; ({a: data.foo} = object);',
		'const data = element.dataset; [data.foo = 1] = array;',
		'const data = element.dataset; [...data.foo] = array;',
		'const data = element.dataset; ({...data.foo} = object);',
		'const data = element.dataset; foo(data);',
		'const data = element.dataset; foo(data.foo());',
		'const data = element.dataset; foo(data.foo`tagged`);',
		'const data = element.dataset; foo(data["foo-bar"]);',
		'const data = element.dataset; foo(data[`fooBar`]);',
		'const data = element.dataset; foo(data[variable]);',
		'const data = element.dataset; foo(data.toString);',
		'const data = element.dataset; foo(data?.foo);',
		'const data = (a + b).dataset; foo(data.foo);',
		'const data = element.querySelector("#selector").dataset; foo(data.foo);',
		'const data = element.dataset, other = 1; foo(data.foo);',
		// The element only has a non-fixable receiver, so report the declaration without inlining
		'for (const data = element.dataset;;) foo(data.foo);',
		'export const data = element.dataset; foo(data.foo);',
		// A shadowing parameter means the outer declaration has no reads to inline
		'const data = element.dataset; function inner(data) { foo(data.foo); }',
		// Inlining would capture a different `element` binding or value, so report without fix
		'const data = element.dataset; function inner(element) { foo(data.fooBar); }',
		'let element = a; const data = element.dataset; element = b; foo(data.fooBar);',
		'const data = /* comment */ element.dataset; foo(data.foo);',
		'const data = element.dataset; foo(data./* comment */foo);',
		'element.dataset /* comment */ .unicorn;',
		'element.dataset.unicorn /* comment */ = "🦄";',
		'delete /* comment */ element.dataset.unicorn;',
		'"unicorn" /* comment */ in element.dataset',
		'Object.hasOwn(element.dataset, /* comment */ "unicorn")',
		'const {unicorn /* comment */} = element.dataset;',
		// Not fixable
		'const result = element.dataset.unicorn = "🦄";',
		'if (delete element.dataset.unicorn) {}',
		'if (delete element?.dataset.unicorn) {}',
		'const {unicorn = "default"} = element.dataset;',
		'const {...rest} = element.dataset;',
		'const {foo, bar} = element.querySelector("#selector").dataset;',
		'for (const {foo} = element.dataset;;) {}',
		'export const {foo} = element.dataset;',
		// A type-asserted element is not a plain identifier, so report without fix
		{code: 'const data = (element as HTMLElement).dataset; foo(data.fooBar);', languageOptions: {parser: parsers.typescript}},
	].map(code => ({options: [{preferAttributes: true}], ...(typeof code === 'string' ? {code} : code)})),
});
