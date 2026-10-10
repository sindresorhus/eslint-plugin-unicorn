import test from 'node:test';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester, languages} from './utils/test.js';

const {test: testRule} = getTester(import.meta);
const valid = [];
const invalid = [];
const addCases = cases => {
	valid.push(...cases.valid);
	invalid.push(...cases.invalid);
};

for (const language of [languages.json, languages.jsonc, languages.json5]) {
	addCases({
		valid: [
			'42',
			'{}',
			'[]',
			'[1, 2, {"a": true, "b": false}]',
			String.raw`["comma,  inside", "escaped\",comma"]`,
			'[1,\n\t2]',
			'[1 \n\t, 2]',
			'[1, \r\n  2]',
			'[1 \r\n  , 2]',
			'[1, \r  2]',
			'[1 \r  , 2]',
		].map(code => ({code, language})),
		invalid: [
			'[1,2]',
			'[1 , 2]',
			'[1,  2]',
			'[1,\t2]',
			'[1 \t , \t 2]',
			'{"a": 1,"b": 2}',
			'{"a": [1,2],"b": {"c": 3 ,"d": 4}}',
			'[1,\n2 , 3]',
			'[1\n,2]',
		].map(code => ({code, language})),
	});

	test(`fixes all commas and is idempotent: ${language.name}`, t => {
		const linter = new Linter();
		const config = {
			language: language.language,
			plugins: {...language.plugins, unicorn},
			rules: {'unicorn/comma-spacing': 'error'},
		};
		for (const [code, output] of [
			['\uFEFF{"items":["😀, text" ,2,  3],"object":{"a":true ,"b":false}}', '\uFEFF{"items":["😀, text", 2, 3], "object":{"a":true, "b":false}}'],
			['[1 ,\r\n 2\r ,3 ,\n4]', '[1,\r\n 2\r , 3,\n4]'],
		]) {
			const result = linter.verifyAndFix(code, config);
			t.assert.strictEqual(result.fixed, true);
			t.assert.strictEqual(result.output, output);
			t.assert.deepStrictEqual(result.messages, []);
			t.assert.deepStrictEqual(linter.verifyAndFix(result.output, config), {...result, fixed: false});
		}
	});
}

for (const language of [languages.jsonc, languages.json5]) {
	addCases({
		valid: [
			'[1/* before */, /* after */2]',
			'[1, // comment,  comma\n2]',
			'[1,\n/* comment */2]',
			'[1 /* multiline\ncomment */, 2]',
			'[1/* comma,  inside */, 2]',
		].map(code => ({code, language})),
		invalid: [
			'[1/* before */ ,/* after */2]',
			'[1,  /* comment */  2]',
			'[1,// comment\n2]',
			'[1/* multiline\ncomment */ ,2]',
			'[1,/* multiline\ncomment */2]',
		].map(code => ({code, language})),
	});

	addCases({
		valid: [
			'[1,]',
			'[1,  ]',
			'{"a": 1,\t}',
			'[1,\n]',
			'[1, /* comment */]',
		].map(code => ({code, language, languageOptions: language === languages.jsonc ? {allowTrailingCommas: true} : {}})),
		invalid: [
			'[1 ,  ]',
			'{"a": 1 ,}',
			'[1,/* comment */]',
		].map(code => ({code, language, languageOptions: language === languages.jsonc ? {allowTrailingCommas: true} : {}})),
	});

	test(`preserves spacing after trailing commas when fixing other gaps: ${language.name}`, t => {
		const linter = new Linter();
		const config = {
			language: language.language,
			plugins: {...language.plugins, unicorn},
			languageOptions: language === languages.jsonc ? {allowTrailingCommas: true} : {},
			rules: {'unicorn/comma-spacing': 'error'},
		};
		const result = linter.verifyAndFix('{"array": [1 ,2 ,  ],"object": {"a": 1 ,\t}}', config);
		t.assert.strictEqual(result.fixed, true);
		t.assert.strictEqual(result.output, '{"array": [1, 2,  ], "object": {"a": 1,\t}}');
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.deepStrictEqual(linter.verifyAndFix(result.output, config), {...result, fixed: false});
	});
}

addCases({
	valid: [
		'[1, \u2028  2]',
		'[1 \u2028  , 2]',
		'[1, \u2029\t2]',
		'[1\t\u2029 , 2]',
		'[\'comma,  inside\', "continued\\\n,  inside"]',
	].map(code => ({code, language: languages.json5})),
	invalid: [
		'[1\u00A0,\u00A02]',
		'[1\v\f,\v\f2]',
		'[1\u2003\u2009,\u2003\u20092]',
		'{unquoted: +Infinity,other: NaN,hex: 0xFF}',
		'[1,\u20282 ,3]',
	].map(code => ({code, language: languages.json5})),
});

testRule.snapshot({valid, invalid});

test('preserves JSON5 Unicode line separators while fixing horizontal whitespace', t => {
	const linter = new Linter();
	const config = {
		language: languages.json5.language,
		plugins: {...languages.json5.plugins, unicorn},
		rules: {'unicorn/comma-spacing': 'error'},
	};
	const result = linter.verifyAndFix('[1 \u2028 ,2 ,\u2029 3\u00A0,\u00A04 ,\t]', config);
	t.assert.strictEqual(result.fixed, true);
	t.assert.strictEqual(result.output, '[1 \u2028 , 2,\u2029 3, 4,\t]');
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.deepStrictEqual(linter.verifyAndFix(result.output, config), {...result, fixed: false});
});

for (const language of [languages.jsonc, languages.json5]) {
	test(`preserves comments and whitespace beyond adjacent comments: ${language.name}`, t => {
		const linter = new Linter();
		const config = {
			language: language.language,
			plugins: {...language.plugins, unicorn},
			rules: {'unicorn/comma-spacing': 'error'},
		};
		const result = linter.verifyAndFix('[1 /* before,  */ ,/* after,  */  2,// end,  \r\n3 // before comma,  \r\n\t,4]', config);
		t.assert.strictEqual(result.fixed, true);
		t.assert.strictEqual(result.output, '[1 /* before,  */, /* after,  */  2, // end,  \r\n3 // before comma,  \r\n\t, 4]');
		t.assert.deepStrictEqual(result.messages, []);
		t.assert.deepStrictEqual(linter.verifyAndFix(result.output, config), {...result, fixed: false});
	});
}

test('works with indentation and empty delimiter spacing', t => {
	const linter = new Linter();
	const config = {
		language: languages.json.language,
		plugins: {...languages.json.plugins, unicorn},
		rules: {
			'unicorn/comma-spacing': 'error',
			'unicorn/indent': 'error',
			'unicorn/empty-brace-spaces': 'error',
		},
	};
	const result = linter.verifyAndFix('{\r\n  "items": [1 ,2,{ }],\r\n  "empty": [ ]\r\n}', config);
	t.assert.strictEqual(result.output, '{\r\n\t"items": [1, 2, {}],\r\n\t"empty": []\r\n}');
	t.assert.deepStrictEqual(result.messages, []);
	t.assert.strictEqual(linter.verifyAndFix(result.output, config).fixed, false);
});

testRule.snapshot({
	valid: [
		'value: [1, 2,]',
		'value: [1,\n2]',
		'value: \'1 ,2\' # ,',
		'value: [1, /* keep */2]',
	].map(testCase => ({language: languages.soml, ...(typeof testCase === 'string' ? {code: testCase} : testCase)})),
	invalid: [
		'value: [1 ,2,  3]',
		'{first: 1,second: 2}',
		'value: [1,/* keep */2]',
		'value: [1 /* keep */ ,2]',
		'value: [1,# keep\n2]',
		'value: [1 ,]',
		'value: [1,\t2]',
	].map(testCase => ({language: languages.soml, ...(typeof testCase === 'string' ? {code: testCase} : testCase)})),
});
