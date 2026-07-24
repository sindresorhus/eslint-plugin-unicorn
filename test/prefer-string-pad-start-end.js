import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const MESSAGE_ID = 'prefer-string-pad-start-end';
const MESSAGE_ID_SUGGESTION = 'suggest-padding-method';

test({
	valid: [
		// Known non-string target (type information)
		{
			code: 'function f(bar: number[]) { const foo = " ".repeat(10 - bar.length) + bar; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(bar: {length: number}) { const foo = " ".repeat(10 - bar.length) + bar; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function f(bar: number) { const foo = " ".repeat(10 - bar.length) + bar; }',
			languageOptions: {parser: parsers.typescript},
		},
		'const foo = bar.padStart(10);',
		'const foo = bar.padStart(10, "*");',
		'const foo = bar.padEnd(10);',
		'const foo = bar.padEnd(10, "*");',
		'const foo = pad.repeat(10 - bar.length) + bar;',
		'const foo = "**".repeat(10 - bar.length) + bar;',
		'const foo = "*".repeat(10 - foo().length) + foo();',
		'const foo = "*".repeat(10 - bar.length) + baz;',
		'const foo = bar + "*".repeat(10 - baz.length);',
		'const foo = "*".repeat(10 - true.length) + true;',
		'const value = 42; const foo = "*".repeat(width - value.length) + value;',
		'const value = function () {}; const foo = "*".repeat(width - value.length) + value;',
		'const value = class {}; const foo = value + "*".repeat(width - value.length);',
		'function value() {} const foo = "*".repeat(width - value.length) + value;',
		'class Value {} const foo = Value + "*".repeat(width - Value.length);',
		'const foo = "*".repeat(10 - bar?.length) + bar;',
		'const foo = "*"["repeat"](10 - bar.length) + bar;',
		'const foo = "*".repeat?.(10 - bar.length) + bar;',
		'const foo = "*".repeat(...[10 - bar.length]) + bar;',
		'const foo = ("*".repeat(10) + bar).slice(-9);',
		'const foo = (bar + "*".repeat(10)).slice(1, 10);',
		'const foo = ("*".repeat(width) + bar).slice(-width);',
		'const foo = (bar + "*".repeat(width)).slice(0, width);',
		'const foo = ("*".repeat((value = "bar", 10)) + value).slice(-(value = "bar", 10));',
		'const foo = (value + "*".repeat((value = "bar", 10))).slice(0, (value = "bar", 10));',
		'const foo = (value + "*".repeat(10)).slice((value = "bar", 0), 10);',
		'const foo = ("**".repeat(10) + bar).slice(-10);',
		'const foo = ("*".repeat(width) + 42).slice(-width);',
		'const foo = ([1, 2] + "*".repeat(width)).slice(0, width);',
		'const foo = ("*".repeat(width) + [bar]).slice(-width);',
		'const foo = ({bar} + "*".repeat(width)).slice(0, width);',
		'const foo = ("*".repeat(width) + object?.property).slice(-width);',
		'const foo = (object?.property + "*".repeat(width)).slice(0, width);',
		'const foo = ("*".repeat(width) + object.property).slice(-width);',
		'const foo = (object.property + "*".repeat(width)).slice(0, width);',
		'const foo = ("*".repeat(object.width) + object.property).slice(-object.width);',
		'const foo = (object.property + "*".repeat(object.width)).slice(0, object.width);',
		'const foo = ("*".repeat(10n) + value).slice(-10n);',
		'const foo = ("*".repeat(width) + function () {}).slice(-width);',
		'const foo = (class {} + "*".repeat(width)).slice(0, width);',
	],
	invalid: [
		{
			code: 'const foo = " ".repeat(10 - bar.length) + bar;',
			output: 'const foo = bar.padStart(10);',
			errors: [{messageId: MESSAGE_ID}],
		},
		// A target that is known to be a string must still be reported
		{
			code: 'function f(bar: string) { const foo = " ".repeat(10 - bar.length) + bar; }',
			output: 'function f(bar: string) { const foo = bar.padStart(10); }',
			errors: [{messageId: MESSAGE_ID}],
			languageOptions: {parser: parsers.typescript},
		},
		// A function declaration's parameter must not be mistaken for the function itself
		{
			code: 'function f(bar) { const foo = " ".repeat(10 - bar.length) + bar; }',
			output: 'function f(bar) { const foo = bar.padStart(10); }',
			errors: [{messageId: MESSAGE_ID}],
		},
		// The other parameter forms, which were never affected by that mistake
		{
			code: 'const f = bar => { const foo = " ".repeat(10 - bar.length) + bar; };',
			output: 'const f = bar => { const foo = bar.padStart(10); };',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const f = function (bar) { const foo = " ".repeat(10 - bar.length) + bar; };',
			output: 'const f = function (bar) { const foo = bar.padStart(10); };',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'class Foo { f(bar) { const foo = " ".repeat(10 - bar.length) + bar; } }',
			output: 'class Foo { f(bar) { const foo = bar.padStart(10); } }',
			errors: [{messageId: MESSAGE_ID}],
		},
		// A destructuring pattern's initializer is not the bound variable's value
		{
			code: 'const [bar] = ["x"]; const foo = " ".repeat(10 - bar.length) + bar;',
			output: 'const [bar] = ["x"]; const foo = bar.padStart(10);',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const {bar} = {bar: "x"}; const foo = " ".repeat(10 - bar.length) + bar;',
			output: 'const {bar} = {bar: "x"}; const foo = bar.padStart(10);',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = "*".repeat(10 - bar.length) + bar;',
			output: 'const foo = bar.padStart(10, "*");',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = bar + " ".repeat(10 - bar.length);',
			output: 'const foo = bar.padEnd(10);',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = bar + "*".repeat(10 - bar.length);',
			output: 'const foo = bar.padEnd(10, "*");',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = "*".repeat(width - value.length) + value;',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = value + "*".repeat(width - value.length);',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = "*".repeat(width - object.property.length) + object.property;',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = object.property + "*".repeat(width - object.property.length);',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = "*".repeat((value = "bar", width) - value.length) + value;',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = value + "*".repeat((value = "bar", width) - value.length);',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = "*".repeat((value = "bar", 10) - value.length) + value;',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = value + "*".repeat((value = "bar", 10) - value.length);',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = (value = "bar", "*").repeat(10 - value.length) + value;',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = value + (value = "bar", "*").repeat(10 - value.length);',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = "*".repeat(10n - value.length) + value;',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = "*".repeat(width - (object?.property).length) + object?.property;',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = object?.property + "*".repeat(width - (object?.property).length);',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'foo\n"*".repeat(10 - (value).length) + (value)',
			output: 'foo\n;(value).padStart(10, "*")',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = "*".repeat(width - value.length) /* comment */ + value;',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = ("*".repeat(10) + bar).slice(-10);',
			errors: [{
				messageId: MESSAGE_ID,
				suggestions: [{
					messageId: MESSAGE_ID_SUGGESTION,
					output: 'const foo = bar.padStart(10, "*");',
				}],
			}],
		},
		{
			code: 'const foo = (bar + "*".repeat(10)).slice(0, 10);',
			errors: [{
				messageId: MESSAGE_ID,
				suggestions: [{
					messageId: MESSAGE_ID_SUGGESTION,
					output: 'const foo = bar.padEnd(10, "*");',
				}],
			}],
		},
		{
			code: 'const foo = ("*".repeat(10) /* comment */ + value).slice(-10);',
			errors: [{messageId: MESSAGE_ID, suggestions: 0}],
		},
		{
			code: 'const foo = ((value = "bar", "*").repeat(10) + value).slice(-10);',
			errors: [{messageId: MESSAGE_ID, suggestions: 0}],
		},
		{
			code: 'const foo = (value + (value = "bar", "*").repeat(10)).slice(0, 10);',
			errors: [{messageId: MESSAGE_ID, suggestions: 0}],
		},
	],
});

test.typescript({
	valid: [],
	invalid: [
		{
			code: 'const foo = "*".repeat(width - (object.property as string).length) + (object.property as string);',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const foo = object.property! + "*".repeat(width - object.property!.length);',
			errors: [{messageId: MESSAGE_ID}],
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'const foo = `*`.repeat(10 - bar.length) + bar;',
		String.raw`const foo = "\t".repeat(width - bar.length) + bar;`,
		'const foo = bar + `*`.repeat(10 - bar.length);',
		'const foo = ("*".repeat(10) + bar).slice(-10);',
		'const foo = (bar + "*".repeat(10)).slice(0, 10);',
		outdent`
			const foo = (
				"*"
					.repeat(
						width
							-
							bar.length
					)
				+
				bar
			);
		`,
	],
});
