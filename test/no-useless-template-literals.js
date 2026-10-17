/* eslint-disable no-template-curly-in-string */
import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

const typescript = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: false},
	},
});
const typeAware = code => ({
	code,
	filename: 'file.ts',
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
});

const getSuggestionCase = (code, output) => ({
	code,
	errors: [{
		messageId: 'no-useless-template-literals',
		suggestions: [{messageId: 'no-useless-template-literals/suggestion', output}],
	}],
});

// Keyword spacing
test({
	valid: [],
	invalid: [
		getSuggestionCase('function value(input) { return`${input}`; }', 'function value(input) { return String(input); }'),
		getSuggestionCase('function value(input) { return(`${input}`); }', 'function value(input) { return (String(input)); }'),
		getSuggestionCase('async function value(input) { return await`${input}`; }', 'async function value(input) { return await String(input); }'),
		getSuggestionCase('for (const value of`${input}`);', 'for (const value of String(input));'),
		getSuggestionCase('`${input}`in object;', 'String(input) in object;'),
		{
			code: 'function value() { return`${5}`; }',
			output: 'function value() { return\'5\'; }',
			errors: 1,
		},
	],
});

test.snapshot({
	valid: [
		'const string = `plain template`;',
		'const string = `before${value}after`;',
		'const string = `${value}${otherValue}`;',
		'const string = tag`${"value"}`;',
		'const string = String.raw`${"value"}`;',
		'const string = html`<p>${"value"}</p>`;',
		'const string = `before${"head" + value + "tail"}after`;',
		typescript('const string = `before${value as string}after`;'),
		typescript('const string = `${Math.random() > 0.5 ? 1 : 0}` as const;'),
		typescript('const string = <const>`${Math.random() > 0.5 ? 1 : 0}`;'),
		typescript('const value: string = getValue(); const string = `${value}` as const;'),
		typescript('const string = `${value}`;'),
		typescript(outdent`
			declare function someFunctionCall(options: {someParam: '0' | '1'}): void;
			const someCondition = Math.random() > 0.5;
			someFunctionCall({someParam: \`\${someCondition ? 1 : 0}\`});
		`),
		typeAware(outdent`
			declare function someFunctionCall(options: {someParam: '0' | '1'}): void;
			const someCondition = Math.random() > 0.5;
			someFunctionCall({someParam: \`\${someCondition ? 1 : 0}\`});
		`),
		typeAware('declare const value: string; const string = `${value}` as const;'),
		typeAware('declare const value: string; const string = <const>`${value}`;'),
	],
	invalid: [
		'const string = `${value}`;',
		'const string = `${object.property}`;',
		'const string = `${chalk.bold("Hello")}`;',
		'const string = `${foo, bar}`;',
		'const string = `${/regexp/}`;',
		'const symbol = Symbol("x"); const string = `${symbol}`;',
		'function String(value) { return value; } const string = `${value}`;',
		'const string = `${-1}`;',
		'const string = `${+1}`;',
		'const string = `${-0}`;',
		'const string = `${-123n}`;',
		'const string = `${"value"}`;',
		'const string = `${\'value\'}`;',
		'const string = `${`value`}`;',
		'const string = `${123}`;',
		'const string = `${123n}`;',
		'const string = `${true}`;',
		'const string = `${false}`;',
		'const string = `${null}`;',
		typescript('const string = `${"value"}` as const;'),
		typescript('const string = <const>`${"value"}`;'),
		{
			code: 'const value = getValue(); const string = `${value}`;',
			filename: 'file.js',
			languageOptions: {parser: parsers.typescript},
		},
		typeAware('declare const value: string; const string = `${value}` as string;'),
		typeAware('declare const value: string; const string = <string>`${value}`;'),
		typeAware('declare const value: string; const string = `${value}` satisfies string;'),
		typeAware('declare const value: string; const string = `${value}`;'),
		typeAware(outdent`
			declare function someFunctionCall(options: {someParam: string}): void;
			const someCondition = Math.random() > 0.5;
			someFunctionCall({someParam: \`\${someCondition ? 1 : 0}\`});
		`),
		'const string = `${"hello"}${"world"}`;',
		'const string = `before${"middle"}after`;',
		'const string = `before${"middle"}${value}after`;',
		'const string = `before${value}${"middle"}after`;',
		'const string = `before${"middle"}${value}${"tail"}after`;',
		'const string = `before${123}${value}${true}after`;',
		'const string = `${"before"}${value}${"after"}`;',
		'const string = `${"\\\\n"}${value}`;',
		'const string = `${"`"}${value}`;',
		'const string = `${"${"}${value}`;',
		'const string = `${"$"}{value}`;',
		'const string = `${`$`}{value}`;',
		'const string = `${"\\\\"}${value}`;',
		'const string = `\\0${"1"}${value}`;',
		'const string = `before${/* keep */ value}${"middle"}after`;',
		{
			code: 'const string = `${"\\1"}${value}`;',
			languageOptions: {sourceType: 'script'},
		},
		{
			code: '`${"use strict"}`; with (object) { property; }',
			languageOptions: {sourceType: 'script'},
		},
		{
			code: '`${"use "}${"strict"}`; with (object) { property; }',
			languageOptions: {sourceType: 'script'},
		},
		{
			code: 'function foo() { `${"use strict"}`; with (object) { property; } }',
			languageOptions: {sourceType: 'script'},
		},
		{
			code: '`before${"middle"}after`; with (object) { property; }',
			languageOptions: {sourceType: 'script'},
		},
		{
			code: 'function foo() { `before${"middle"}after`; with (object) { property; } }',
			languageOptions: {sourceType: 'script'},
		},
		'const string = `${\n\t/* comment */\n\t"value"\n}`;',
		'const string = `before${\n\t/* comment */\n\t"middle"\n}after`;',
		// `\u{…}` ends at its closing brace, so merging a following hex digit into it is safe
		'const string = `\\u{41}${1}`;',
		'const string = `\\u{41}${"b"}`;',
		'const string = `\\u{1F600}${1}`;',
		'const string = `before\\u{41}${1}after`;',
		'const string = `\\u{41}${1}${value}`;',
		// A unary expression on a non-literal is dynamic
		'const string = `${-value}`;',
		// `{` after a `$` needs the `$` escaped, unless it already is
		'const string = `a${"{b"}`;',
		'const string = `\\\\$${"{b"}`;',
		'const string = `\\$${"{b"}`;',
		// A digit after a `\0` escape would turn it into a legacy octal escape
		'const string = `${"\\0"}1${value}`;',
		// Not in a directive prologue
		'if (condition) `${"use strict"}`;',
		'"use strict"; `${"value"}`;',
		'foo(); `${"value"}`;',
	],
});

// A new call inside a constructor callee must retain the constructor grouping.
test({
	valid: [],
	invalid: [getSuggestionCase('new `${value}`.constructor("text");', 'new (String(value)).constructor("text");')],
});

test({
	valid: [],
	invalid: [
		getSuggestionCase('new (`${value}`).constructor("text");', 'new (String(value)).constructor("text");'),
		getSuggestionCase('new (`${value}`.constructor)("text");', 'new (String(value).constructor)("text");'),
		{
			code: 'new `${/* keep */ value}`.constructor("text");',
			errors: [{messageId: 'no-useless-template-literals', suggestions: []}],
		},
	],
});

nodeTest('template conversion keeps the enclosing constructor call', t => {
	const linter = new Linter();
	const config = {plugins: {unicorn: {rules: {'no-useless-template-literals': rule}}}, rules: {'unicorn/no-useless-template-literals': 'error'}};
	const code = 'const value = "value"; new `${value}`.constructor("text") instanceof String;';
	const [message] = linter.verify(code, config);
	const {range, text} = message.suggestions[0].fix;
	const output = code.slice(0, range[0]) + text + code.slice(range[1]);
	t.assert.deepStrictEqual(linter.verify(output, config), []);
	t.assert.strictEqual(runInNewContext(code), true);
	t.assert.strictEqual(runInNewContext(output), true);
});
