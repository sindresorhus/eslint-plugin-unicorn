/* eslint-disable no-template-curly-in-string */
import test from 'ava';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester, languages, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);
const MESSAGE_ID = 'prefer-short-escape-sequences';

const json = {
	...languages.jsonc,
	name: 'json',
	language: 'json/json',
};

ruleTest.snapshot({
	valid: [
		{
			code: String.raw`{"short":"\b\t\n\f\r\"\\/"}`,
			filename: 'fixture.json',
			language: json,
		},
		{
			code: String.raw`"\u0000\u000B\u0027\u0041"`,
			filename: 'fixture.json',
			language: json,
		},
		{
			code: String.raw`"\\u000A\\\\u000A"`,
			filename: 'fixture.json',
			language: json,
		},
		{
			code: String.raw`"\/"`,
			filename: 'fixture.json',
			language: json,
		},
		{
			code: String.raw`{
				// Keep the comment.
				"value": "\u0041"
			}`,
			filename: 'fixture.jsonc',
			language: languages.jsonc,
		},
		{
			code: String.raw`{value: "\v\0\'"}`,
			filename: 'fixture.json5',
			language: languages.json5,
		},
		{
			code: String.raw`"\u00000\u00009"`,
			filename: 'fixture.json5',
			language: languages.json5,
		},
		{
			code: String.raw`"\\u000B"`,
			filename: 'fixture.json5',
			language: languages.json5,
		},
		{
			code: String.raw`{\u0061: "\u0000\u000B\u0027"}`,
			filename: 'fixture.config',
			language: languages.json5,
		},
	],
	invalid: [
		{
			code: String.raw`{"\u0009":"\u0008\u0009\u000a\u000C\u000d\u0022\u002f\u005c"}`,
			filename: 'fixture.json',
			language: json,
		},
		{
			code: String.raw`{
				// Keep the comment.
				"\u000A": "\u0008\u0009\u000A\u000C\u000D\u0022\u002F\u005C"
			}`,
			filename: 'fixture.jsonc',
			language: languages.jsonc,
		},
		{
			code: String.raw`{"\u0008":"\u0009\u000A\u000C\u000D\u0022\u002F\u005C"}`,
			filename: 'fixture.json5',
			language: languages.json5,
		},
		{
			code: String.raw`"\\\u000A"`,
			filename: 'fixture.json',
			language: json,
		},
		{
			code: String.raw`{'\u0022':'\u000B\u000b\u0000\u0027'}`,
			filename: 'fixture.json5',
			language: languages.json5,
		},
		{
			code: String.raw`{"\u0027":"\u0027\u0022"}`,
			filename: 'fixture.JSON5',
			language: languages.json5,
		},
		{
			code: String.raw`"\u00001\u000B"`,
			filename: 'fixture.json5',
			language: languages.json5,
		},
		{
			code: String.raw`"\u0000\u0030"`,
			filename: 'fixture.json5',
			language: languages.json5,
		},
		{
			code: String.raw`"\u0000١"`,
			filename: 'fixture.json5',
			language: languages.json5,
		},
		{
			code: String.raw`'before\
\u000Aafter'`,
			filename: 'fixture.json5',
			language: languages.json5,
		},
		{
			code: String.raw`"\u000A\u000B"`,
			language: languages.json5,
		},
	],
});

ruleTest({
	testerOptions: json,
	valid: [],
	invalid: [
		{
			code: String.raw`["\u005C\u0022","\u005Cn","\u005Cu000A"]`,
			filename: 'fixture.json',
			output: String.raw`["\\\"","\\n","\\u000A"]`,
			errors: [
				{messageId: MESSAGE_ID},
				{messageId: MESSAGE_ID},
				{messageId: MESSAGE_ID},
			],
		},
	],
});

ruleTest({
	testerOptions: languages.json5,
	valid: [],
	invalid: [
		{
			code: String.raw`'\u005C\u0027'`,
			filename: 'fixture.json5',
			output: String.raw`'\\\''`,
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: String.raw`"\u005C\u0022"`,
			filename: 'fixture.json5',
			output: String.raw`"\\\""`,
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: String.raw`'\u005C\u0000'`,
			filename: 'fixture.json5',
			output: String.raw`'\\\0'`,
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: String.raw`'\u0022'`,
			filename: 'fixture.config',
			output: String.raw`'\"'`,
			errors: [{messageId: MESSAGE_ID}],
		},
		{
			code: '\'before\\\r\n' + String.raw`\u000Aafter'`,
			filename: 'fixture.json5',
			output: '\'before\\\r\n' + String.raw`\nafter'`,
			errors: [{messageId: MESSAGE_ID}],
		},
	],
});

ruleTest({
	valid: [
		String.raw`const text = '\b\t\n\v\f\r\0';`,
		String.raw`const text = '\u0041\u00001';`,
		String.raw`const text = '\\u000A\\\\u000A';`,
		{
			code: String.raw`const element = <div title="\u000A" />;`,
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'const text = tag`\\u000A`;',
		'const text = String.raw`\\u000A`;',
		String.raw`const pattern = /\u000A/u;`,
	],
	invalid: [
		{
			code: String.raw`const text = "\u0008\u0009\u000a\u000B\u000c\u000D\u0000";`,
			output: String.raw`const text = "\b\t\n\v\f\r\0";`,
		},
		{
			code: String.raw`const text = '\u0022\u0027\u002F\u005C';`,
			output: String.raw`const text = '"\'/\\';`,
		},
		{
			code: String.raw`const text = "\u0022\u0027\u0060";`,
			output: 'const text = "\\"\'`";',
		},
		{
			code: String.raw`const text = "\u005C\u0022";`,
			output: String.raw`const text = "\\\"";`,
		},
		{
			code: String.raw`const object = {'\u000A': "\u0009"};`,
			output: String.raw`const object = {'\n': "\t"};`,
			errors: [{messageId: MESSAGE_ID}, {messageId: MESSAGE_ID}],
		},
		{
			code: 'const text = `\\u000A${value}\\u0022`;',
			output: 'const text = `\\n${value}"`;',
			errors: [{messageId: MESSAGE_ID}, {messageId: MESSAGE_ID}],
		},
		{
			code: 'const text = `line one\r\n\\u000A`;',
			output: 'const text = `line one\r\n\\n`;',
		},
		{
			code: 'const text = `\\u0060`;',
			output: 'const text = `\\``;',
		},
		{
			code: 'const text = `\\u005C\\u0022`;',
			output: 'const text = `\\\\"`;',
		},
		{
			code: 'const text = `before \\u000A${tag`raw \\u000B`}${`after \\u0009`}`;',
			output: 'const text = `before \\n${tag`raw \\u000B`}${`after \\t`}`;',
			errors: [{messageId: MESSAGE_ID}, {messageId: MESSAGE_ID}],
		},
		{
			code: String.raw`const text = "\u0000\u0031";`,
			output: String.raw`const text = "\0\u0031";`,
		},
		{
			code: String.raw`const text: string = "\u000A";`,
			output: String.raw`const text: string = "\n";`,
			languageOptions: {parser: parsers.typescript},
		},
	].map(item => ({errors: [{messageId: MESSAGE_ID}], ...item})),
});

test('Short and code point escapes converge when both rules are enabled', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn},
		rules: {
			'unicorn/prefer-short-escape-sequences': 'error',
			'unicorn/prefer-unicode-code-point-escapes': 'error',
		},
	};
	const code = 'const text = "\\u000A\\u00001\\u2661"; const pattern = /\\u000A/u;\nconst template = `\\u000A`;';
	const expected = 'const text = "\\n\\u{0}1\\u{2661}"; const pattern = /\\u{A}/u;\nconst template = `\\n`;';
	const result = linter.verifyAndFix(code, config);

	t.true(result.fixed);
	t.deepEqual(result.messages, []);
	t.is(result.output, expected);
	t.false(linter.verifyAndFix(result.output, config).fixed);
});

ruleTest({
	testerOptions: languages.toml,
	valid: [
		String.raw`value = "\b\t\n\f\r\e\"\\"`,
		String.raw`value = "\u0000\u000B\u001B\u0041"`,
		{
			code: String.raw`value = "\u001B"`,
			languageOptions: {parserOptions: {tomlVersion: '1.0.0'}},
		},
		String.raw`value = "\\u000A\\\\u000A"`,
		String.raw`value = '\u000A'`,
		String.raw`'\u000A' = 1`,
		String.raw`value = '''\u000A'''`,
		'value = 42',
	],
	invalid: [
		{
			code: String.raw`value = "\u0008\u0009\u000a\u000C\u000D\u0022\u0027\u002F\u005C" # Keep this comment.`,
			output: String.raw`value = "\b\t\n\f\r\"'/\\" # Keep this comment.`,
		},
		{
			code: String.raw`"\u0009"."\u0022" = "\u000A"`,
			output: String.raw`"\t"."\"" = "\n"`,
			errors: [{messageId: MESSAGE_ID}, {messageId: MESSAGE_ID}, {messageId: MESSAGE_ID}],
		},
		{
			code: 'value = """\n' + String.raw`\u000A\u0022\u005C` + '\n"""',
			output: 'value = """\n' + String.raw`\n\"\\` + '\n"""',
		},
		{
			code: 'value = """before\\\n  \\u000Aafter"""',
			output: 'value = """before\\\n  \\nafter"""',
		},
		{
			code: String.raw`value = "\u005C\u0022"`,
			output: String.raw`value = "\\\""`,
		},
		{
			code: String.raw`["\u000A"]` + '\n' + String.raw`value = "\u0009"`,
			output: String.raw`["\n"]` + '\n' + String.raw`value = "\t"`,
			errors: [{messageId: MESSAGE_ID}, {messageId: MESSAGE_ID}],
		},
		{
			code: String.raw`value = """\u0022"""`,
			output: String.raw`value = """\""""`,
		},
		{
			code: String.raw`value = """x\u0022""""`,
			output: String.raw`value = """x\"""""`,
		},
		{
			code: String.raw`value = "\u000A\u001B"`,
			output: String.raw`value = "\n\u001B"`,
			languageOptions: {parserOptions: {tomlVersion: '1.0.0'}},
		},
	].map(item => ({errors: [{messageId: MESSAGE_ID}], ...item})),
});
