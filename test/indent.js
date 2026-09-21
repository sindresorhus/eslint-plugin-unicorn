import test from 'ava';
import {Linter} from 'eslint';
import {tokenize, tokenTypes} from '@eslint/css-tree';
import unicorn from '../index.js';
import {getTester, languages} from './utils/test.js';

const {test: testRule} = getTester(import.meta);
const valid = [];
const invalid = [];
const addCases = cases => {
	valid.push(...cases.valid);
	invalid.push(...cases.invalid);
};

const json = {name: 'json', language: 'json/json', plugins: languages.jsonc.plugins};

for (const language of [json, languages.jsonc, languages.json5]) {
	addCases({
		valid: [
			'{}',
			'[1, {"value": 2}]',
			'{\n\t"value": [\n\t\t1,\n\t\t2\n\t]\n}',
			'{\n\t"value": 1\n \t \n}',
			{code: '{\n  "value": {\n    "nested": true\n  }\n}', options: [{indent: 2}]},
			{code: '[\n   1\n]', options: [{indent: 3, tabWidth: 8}]},
		].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), language})),
		invalid: [
			'{\n"value": 1\n}',
			'{\n   "value": 1\n  }',
			'  {"value": 1}',
			'\t42',
			'{\n \t"value": [1, {\n"nested": "[{]}"\n}]\n}',
			{code: '{\n\t"value": 1\n}', options: [{indent: 2}]},
			{code: '[\n  1\n]', options: [{indent: 4}]},
		].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), language})),
	});
}

for (const language of [languages.jsonc, languages.json5]) {
	addCases({
		valid: [
			'// comment\n{\n\t// [{\n\t"value": 1\n}',
			'{\n\t/* comment\n  * [{\n */ "value": 1\n}',
			'/* comment\n  continued\n */\n{}',
		].map(code => ({code, language})),
		invalid: [
			'{\n // comment\n "value": 1\n}',
			'{\n /* comment\n  * preserve indentation\n */ "value": 1\n}',
			'  // header comment\n{}',
			'{\n/* comment */ }',
		].map(code => ({code, language})),
	});
}

addCases({
	valid: [
		'{\n\tvalue: "first\\\n  second"\n}',
		'{\n\tvalue: \'first\\\n   second\'\n}',
	].map(code => ({code, language: languages.json5})),
	invalid: [
		'{\n\u00A0value: 1\n}',
		'{\n\u2003\u2009value: 1\n}',
		'{\n\v\fvalue: 1\n}',
		'{\n  value: "first\\\n  second"\n}',
	].map(code => ({code, language: languages.json5})),
});

addCases({
	valid: [
		'a {\ncolor: red;\n}',
		'\t\t\ta,\n\tb {\n\tcolor: red;\n}',
		'a {\n  \t \n\tcolor: red;\n}',
		'/* comment\n  * preserve indentation\n */\na {}',
		'a {\n\tcontent: "first\\\n  second";\n}',
		'a {\n\t--value: "first\\\n  second";\n}',
		'\u00A0a { color: red; }',
		'\u2003a { color: red; }',
		{code: 'a {\n    color: red;\n}', options: [{indent: 2}]},
		{code: 'a {\n   color: red;\n}', options: [{indent: 3}]},
	].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), language: languages.css})),
	invalid: [
		'a {\n  color: red;\n}',
		'a {\n     color: red;\n}',
		'a {\n \t color: red;\n}',
		'a {\n\t  color: red;\n}',
		'  a,\n   b { color: red; }',
		'@media screen {\n  a {\n      color: red;\n  }\n}',
		'a {\n  color: rgb(\n   0 0 0\n  );\n}',
		'  /* comment\n * preserve indentation\n */\na {}',
		'a {\n  background: url("data:image/svg+xml;utf8,<svg>{}</svg>");\n}',
		'a {\n  --value: "first\\\n  second";\n}',
		'  \u00A0a {}',
		'a {\n  --value: foo\\31\n  bar;\n}',
		{code: 'a {\n\t color: red;\n}', options: [{indent: 2}]},
		{code: 'a {\n   color: red;\n}', options: [{indent: 2}]},
		{code: 'a {\n \tcolor: red;\n}', options: [{indent: 3, tabWidth: 8}]},
		{code: 'a {\n   color: red;\n}', options: [{tabWidth: 2}]},
	].map(testCase => ({...(typeof testCase === 'string' ? {code: testCase} : testCase), language: languages.css})),
});

invalid.push({
	code: '{\n  "items": [\n    1,\n  ],\n}',
	language: languages.jsonc,
	languageOptions: {allowTrailingCommas: true},
});

testRule.snapshot({valid, invalid});

const fixCases = [
	{language: json, code: '{\n"value": [\n1\n]\n}', output: '{\n\t"value": [\n\t\t1\n\t]\n}'},
	{language: languages.json5, code: '{\n\u00A0value: "first\\\n  second"\n}', output: '{\n\tvalue: "first\\\n  second"\n}'},
	{language: languages.jsonc, code: '{\n  /* comment\n * [{\n */ "value": 1\n}', output: '{\n\t/* comment\n * [{\n */ "value": 1\n}'},
	{language: languages.css, code: 'a {\n     color: red;\n}', output: 'a {\n\t\tcolor: red;\n}'},
	{language: languages.css, code: 'a {\n \tcolor: red;\n}', output: 'a {\n\tcolor: red;\n}'},
	{
		language: languages.css, code: 'a {\n \tcolor: red;\n}', output: 'a {\n      color: red;\n}', options: {indent: 3, tabWidth: 4},
	},
	{language: languages.css, code: 'a {\n  --value: "first\\\n  second";\n}', output: 'a {\n\t--value: "first\\\n  second";\n}'},
	{language: languages.css, code: 'a {\n  --value: foo\\31\n  bar;\n}', output: 'a {\n\t--value: foo\\31\n\tbar;\n}'},
	{language: languages.css, code: 'a {\n  background: url(\n    image.png\n  );\n}', output: 'a {\n\tbackground: url(\n    image.png\n  );\n}'},
	{language: languages.css, code: '  .foo\\ bar {\n  color: red;\n}', output: '\t.foo\\ bar {\n\tcolor: red;\n}'},
	{language: languages.json5, code: '{\n  items: [\n    {value: -Infinity},\n  ],\n}', output: '{\n\titems: [\n\t\t{value: -Infinity},\n\t],\n}'},
	{language: languages.jsonc, code: '{\n  // eslint-disable-next-line unicorn/indent\n  "value": 1\n}', output: '{\n\t// eslint-disable-next-line unicorn/indent\n  "value": 1\n}'},
	{language: languages.css, code: 'a {\n  /* eslint-disable-next-line unicorn/indent */\n  color: red;\n}', output: 'a {\n\t/* eslint-disable-next-line unicorn/indent */\n  color: red;\n}'},
	{
		language: languages.css, code: 'a {\n\t color: red;\n}', output: 'a {\n  color: red;\n}', options: {indent: 1, tabWidth: 1},
	},
];

const getConfig = (language, options = {}) => ({
	files: ['**'],
	language: language.language,
	plugins: {...language.plugins, unicorn},
	rules: {'unicorn/indent': ['error', options]},
});

for (const separator of ['\u2028', '\u2029']) {
	test(`preserve unsupported JSON5 line separator ${separator.codePointAt(0)}`, t => {
		const linter = new Linter();
		const code = `{\n${separator}   value: 1\n}`;
		const result = linter.verifyAndFix(code, getConfig(languages.json5));
		t.deepEqual(result.messages, []);
		t.false(result.fixed);
		t.is(result.output, code);
	});
}

for (const {language, code, output} of [
	{language: json, code: '{\r\n  "items": [\r    1  \n  ]\r\n}', output: '{\r\n\t"items": [\r\t\t1  \n\t]\r\n}'},
	{language: languages.css, code: 'a {\r\n  color: red;\r  margin: 0;\f  padding: 0;\n}', output: 'a {\r\n\tcolor: red;\r\tmargin: 0;\f\tpadding: 0;\n}'},
]) {
	test(`preserve mixed line endings and trailing whitespace in ${language.name}`, t => {
		const linter = new Linter();
		const config = getConfig(language);
		const result = linter.verifyAndFix(code, config);
		t.is(result.output, output);
		t.deepEqual(result.messages, []);
		t.false(linter.verifyAndFix(result.output, config).fixed);
	});
}

for (const [index, {language, code, output, options}] of fixCases.entries()) {
	for (const linebreak of ['\n', '\r\n', '\r', ...(language === languages.css ? ['\f'] : [])]) {
		test(`fix preserves content and line endings ${index} ${JSON.stringify(linebreak)}`, t => {
			const linter = new Linter();
			const config = getConfig(language, options);
			const original = '\uFEFF' + code.replaceAll('\n', () => linebreak);
			const expected = '\uFEFF' + output.replaceAll('\n', () => linebreak);
			const fixed = linter.verifyAndFix(original, config);
			t.true(fixed.fixed);
			t.is(fixed.output, expected);
			t.deepEqual(fixed.messages, []);
			t.false(linter.verifyAndFix(fixed.output, config).fixed);

			if (language === languages.css) {
				const getTokens = text => {
					const tokens = [];
					tokenize(text, (type, start, end) => {
						if (type !== tokenTypes.WhiteSpace) {
							tokens.push(text.slice(start, end));
						}
					});
					return tokens;
				};

				t.deepEqual(getTokens(fixed.output), getTokens(original));
			}
		});
	}
}

for (const options of ['tab', 2, {indent: 'space'}, {indent: 0}, {indent: 1.5}, {tabWidth: 0}, {tabWidth: 1.5}, {unknown: true}]) {
	test(`reject invalid options ${JSON.stringify(options)}`, t => {
		const linter = new Linter();
		t.throws(() => linter.verify('{}', getConfig(json, options)));
	});
}

test('indent is opt-in and does not replace JavaScript indent', t => {
	t.false(unicorn.rules.indent.meta.docs.recommended);
	t.is(unicorn.configs.recommended.rules['unicorn/indent'], 'off');
	t.is(unicorn.configs.unopinionated.rules['unicorn/indent'], 'off');
	t.is(unicorn.configs.all.rules['unicorn/indent'], undefined);
	t.is(unicorn.configs.all.rules.indent, undefined);
});
