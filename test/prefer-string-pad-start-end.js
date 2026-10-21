import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const MESSAGE_ID = 'prefer-string-pad-start-end';
const MESSAGE_ID_SUGGESTION = 'suggest-padding-method';

for (const languageOptions of [
	{},
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [
			'/** @param {boolean} value */ function run(value) { return " ".repeat(8 - value.length) + value; }',
			'/** @returns {number} */ function read() { return source; } const value = read(); value + "*".repeat(8 - value.length);',
			'/** @param {{length: number}} value */ function run(value) { return ("*".repeat(8) + value).slice(-8); }',
		].map(code => ({code, filename: 'file.ts'})),
		invalid: [
			{
				code: '/** @param {string} value */ function run(value) { return " ".repeat(8 - value.length) + value; }',
				output: '/** @param {string} value */ function run(value) { return value.padStart(8); }',
				errors: [{messageId: MESSAGE_ID}],
			},
			{
				code: '/** @returns {string} */ function read() { return source; } const value = read(); value + "*".repeat(8 - value.length);',
				output: '/** @returns {string} */ function read() { return source; } const value = read(); value.padEnd(8, "*");',
				errors: [{messageId: MESSAGE_ID}],
			},
			{
				code: '/** @param {string} value */ function run(value) { return ("*".repeat(8) + value).slice(-8); }',
				errors: [{
					messageId: MESSAGE_ID, suggestions: [{
						messageId: MESSAGE_ID_SUGGESTION,
						output: '/** @param {string} value */ function run(value) { return value.padStart(8, "*"); }',
					}],
				}],
			},
			{
				code: '/** @param {string} value */ function run(value) { return (value + " ".repeat(8)).slice(0, 8); }',
				errors: [{
					messageId: MESSAGE_ID, suggestions: [{
						messageId: MESSAGE_ID_SUGGESTION,
						output: '/** @param {string} value */ function run(value) { return value.padEnd(8); }',
					}],
				}],
			},
			{
				code: '/** @param {string} value */ function run(value) { return "*".repeat(8 - value.length) /* keep */ + value; }',
				errors: [{messageId: MESSAGE_ID, suggestions: 0}],
			},
		].map(testCase => ({...testCase, filename: 'file.ts'})),
	});
}

for (const parserOptions of [{}, {projectService: {allowDefaultProject: ['*.ts']}}]) {
	test({
		testerOptions: {languageOptions: {parser: typescriptEslintParser, parserOptions}},
		valid: [{
			code: '/** @param {string} value */ function run(value: boolean) { return " ".repeat(8 - value.length) + value; }',
			filename: 'file.ts',
		}],
		invalid: [{
			code: '/** @param {boolean} value */ function run(value: string) { return " ".repeat(8 - value.length) + value; }',
			output: '/** @param {boolean} value */ function run(value: string) { return value.padStart(8); }',
			filename: 'file.ts',
			errors: [{messageId: MESSAGE_ID}],
		}],
	});
}

// `repeat()` throws for a value longer than the target length, while the padding methods return the value unchanged. The fix only removes that error, so it is still an autofix.
test({
	valid: [],
	invalid: [
		{
			code: 'const value = "long string"; " ".repeat(3 - value.length) + value;',
			output: 'const value = "long string"; value.padStart(3);',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const value = "long string"; value + "*".repeat(3 - value.length);',
			output: 'const value = "long string"; value.padEnd(3, "*");',
			errors: [{messageId: MESSAGE_ID}],
		},
	],
});

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
		'const value = Number(1); const foo = "*".repeat(width - value.length) + value;',
		'const value = Boolean(1); const foo = "*".repeat(width - value.length) + value;',
		'const value = Object.freeze(42); const foo = "*".repeat(width - value.length) + value;',
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
		'const modes = new Set(["foo"]); modes.clear(); const target = modes.size ? "x" : 1; const foo = "*".repeat(10 - target.length) + target;',
		{
			code: 'const modes = new Set(["foo"]); modes.clear(); const target = (modes.size ? "x" : 1) as string; const foo = "*".repeat(10 - target.length) + target;',
			languageOptions: {parser: parsers.typescript},
		},
		'const modes = new Set(["foo"]); modes.clear(); const target = (modes.size && "x") || value; const foo = "*".repeat(10 - target.length) + target;',
		'let condition = true; condition = false; const target = condition ? "x" : 1; const foo = "*".repeat(10 - target.length) + target;',
		'const alias = condition; var condition = true; const target = alias ? "x" : 1; const foo = "*".repeat(10 - target.length) + target;',
		outdent`
			const object = {value: true};
			Object.defineProperty(object, "value", {get() { return false; }});
			const target = object.value ? "x" : value;
			const foo = "*".repeat(10 - target.length) + target;
		`,
		'const object = {value: "*"}; Object.defineProperty(object, "value", {get() { return 1; }}); const target = "x"; const foo = (0, object.value).repeat(10 - target.length) + target;',
		outdent`
			let value = 'x';
			const object = {};
			Object.defineProperty(object, 'trigger', {get() { value = 1; return 0; }});
			const target = (object.trigger, value);
			const foo = '*'.repeat(10 - target.length) + target;
		`,
	],
	invalid: [
		{
			code: 'const foo = " ".repeat(10 - bar.length) + bar;',
			output: 'const foo = bar.padStart(10);',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'const condition = true; let value; const target = condition ? "x" : value; const foo = "*".repeat(10 - target.length) + target;',
			output: 'const condition = true; let value; const target = condition ? "x" : value; const foo = target.padStart(10, "*");',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'let target = 42; target = "x"; const foo = "*".repeat(10 - target.length) + target;',
			output: 'let target = 42; target = "x"; const foo = target.padStart(10, "*");',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'function target() {} target = "x"; const foo = "*".repeat(10 - target.length) + target;',
			output: 'function target() {} target = "x"; const foo = target.padStart(10, "*");',
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: 'function target() {} var target = "x"; const foo = "*".repeat(10 - target.length) + target;',
			output: 'function target() {} var target = "x"; const foo = target.padStart(10, "*");',
			errors: [{messageId: MESSAGE_ID}],
			languageOptions: {sourceType: 'script'},
		},
		{
			code: outdent`
				const object = {};
				Object.defineProperty(object, 'value', {get() { return 'x'; }});
				const stringValue = 'y';
				const target = (object.value, stringValue);
				const foo = '*'.repeat(10 - target.length) + target;
			`,
			output: outdent`
				const object = {};
				Object.defineProperty(object, 'value', {get() { return 'x'; }});
				const stringValue = 'y';
				const target = (object.value, stringValue);
				const foo = target.padStart(10, '*');
			`,
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
			code: 'const foo = "*".repeat(10 - value.length) /* keep */ + value;',
			errors: [{messageId: MESSAGE_ID, suggestions: []}],
		},
		{
			code: 'const foo = value + "*".repeat(10 /* keep */ - value.length);',
			errors: [{messageId: MESSAGE_ID, suggestions: []}],
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
