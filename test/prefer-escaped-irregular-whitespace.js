/* eslint-disable no-template-curly-in-string */
import {getTester, languages, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const irregularWhitespaceCharacters = [
	'\u000B',
	'\u000C',
	'\u0085',
	'\u00A0',
	'\u1680',
	'\u180E',
	'\u2000',
	'\u2001',
	'\u2002',
	'\u2003',
	'\u2004',
	'\u2005',
	'\u2006',
	'\u2007',
	'\u2008',
	'\u2009',
	'\u200A',
	'\u200B',
	'\u2028',
	'\u2029',
	'\u202F',
	'\u205F',
	'\u3000',
	'\uFEFF',
];

const neighboringCharacters = [
	'\u0009',
	'\u0084',
	'\u0086',
	'\u009F',
	'\u00A1',
	'\u167F',
	'\u1681',
	'\u180D',
	'\u180F',
	'\u1FFF',
	'\u200C',
	'\u2027',
	'\u202A',
	'\u202E',
	'\u2030',
	'\u205E',
	'\u2060',
	'\u2FFF',
	'\u3001',
	'\uFEFE',
	'\uFF00',
];

const formatCodePoint = character => `U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
const getCodePointEscape = character => String.raw`\u{${character.codePointAt(0).toString(16).toUpperCase()}}`;

const lineContinuationCharacters = [
	'\u2028',
	'\u2029',
];
const nonBreakingSpace = '\u00A0';
const backslash = '\\';
const escapedNonBreakingSpace = String.raw`\u{A0}`;
const twoBackslashes = backslash.repeat(2);
const threeBackslashes = backslash.repeat(3);
const windowsLinebreak = '\r\n';
const getMultilineTemplate = whitespace => [
	'const value = `head',
	windowsLinebreak,
	whitespace,
	'${first}middle',
	windowsLinebreak,
	whitespace,
	'${second}tail',
	windowsLinebreak,
	whitespace,
	'`;',
].join('');

const escapeParityCases = [
	{
		code: `const value = 'before${twoBackslashes}${nonBreakingSpace}middle${threeBackslashes}${nonBreakingSpace}after';`,
		output: `const value = 'before${twoBackslashes}${escapedNonBreakingSpace}middle${twoBackslashes}${escapedNonBreakingSpace}after';`,
		errors: 1,
	},
	{
		code: `const value = \`before${twoBackslashes}${nonBreakingSpace}middle${threeBackslashes}${nonBreakingSpace}after\`;`,
		output: `const value = \`before${twoBackslashes}${escapedNonBreakingSpace}middle${twoBackslashes}${escapedNonBreakingSpace}after\`;`,
		errors: 1,
	},
];

const lineContinuationWithIrregularWhitespaceCases = lineContinuationCharacters.flatMap(character => [
	{
		code: `const value = 'before${backslash}${character}middle${nonBreakingSpace}after';`,
		output: `const value = 'before${backslash}${character}middle${escapedNonBreakingSpace}after';`,
		errors: 1,
	},
	{
		code: `const value = \`before${backslash}${character}middle${nonBreakingSpace}after\`;`,
		output: `const value = \`before${backslash}${character}middle${escapedNonBreakingSpace}after\`;`,
		errors: 1,
	},
]);

const lineTerminatorParityCases = lineContinuationCharacters.flatMap(character => [
	{
		code: `const value = 'before${twoBackslashes}${character}after';`,
		output: `const value = 'before${twoBackslashes}${getCodePointEscape(character)}after';`,
		errors: 1,
	},
	{
		code: `const value = \`before${twoBackslashes}${character}after\`;`,
		output: `const value = \`before${twoBackslashes}${getCodePointEscape(character)}after\`;`,
		errors: 1,
	},
]);

test.snapshot({
	valid: [
		String.raw`const value = "regular whitespace: \t";`,
		String.raw`const value = '\u{A0}\u{200B}\u{202F}';`,
		String.raw`const value = '\\u{A0}';`,
		String.raw`const pattern = /\u00A0\u200B/;`,
		String.raw`const pattern = /\u{A0}\u{200B}/u;`,
		'const value = `\\u{A0}\\u{200B}`;',
		'const value = tag`\u00A0\u200B`;',
		'const value = String.raw`\u00A0\u200B`;',
		'const value = tag`head\u00A0${first}middle\u200B${second}tail\u202F`;',
		'// Comment with irregular whitespace: \u00A0\u200B',
		'const\u00A0value = 1;',
		...lineContinuationCharacters.flatMap(character => [
			'const value = \'before\\' + character + 'after\';',
			'const value = `before\\' + character + 'after`;',
			`const value = 'before${threeBackslashes}${character}after';`,
			`const value = \`before${threeBackslashes}${character}after\`;`,
		]),
		{
			code: '<div title="\u00A0\u200B">\u202F</div>;',
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {jsx: true},
				},
			},
		},
	],
	invalid: [
		...irregularWhitespaceCharacters.map(character => `const value = '${character}'; // ${formatCodePoint(character)}`),
		'const value = "before\u00A0middle\u200Bafter";',
		'const value = new RegExp(\'\u00A0\u200B\');',
		'const value = \'before\\' + nonBreakingSpace + 'after\';',
		'const value = `before\u00A0middle\u200Bafter`;',
		'const value = `head\u00A0${first}middle\u200B${second}tail\u202F`;',
		'const pattern = /before\u00A0middle/u;',
		'const pattern = /before\u00A0middle/v;',
		'const pattern = /[\u00A0\u200B]/u;',
		'const pattern = /[\u00A0\u200B]/v;',
		'const pattern = /[\\q{before\u00A0after}]/v;',
		'const value = `before\u2028after`;',
		'const value = `before\u00A0${/* comment */ middle}\u200Bafter`;',
		{
			code: '<div>{\'\u00A0\u200B\'}</div>;',
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {jsx: true},
				},
			},
		},
		{
			code: 'const value = \'\u00A0\u200B\' as const;',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'const value = `\u00A0\u200B` as const;',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

test({
	valid: neighboringCharacters.map(character => `const value = '${character}'; // ${formatCodePoint(character)}`),
	invalid: [
		...escapeParityCases,
		...lineContinuationWithIrregularWhitespaceCases,
		...lineTerminatorParityCases,
		{
			code: 'const pattern = /before\u00A0after/;',
			errors: 1,
		},
		{
			code: 'const pattern = /[\u00A0\u200B]/g;',
			errors: 1,
		},
		{
			code: 'const pattern = /before\\' + nonBreakingSpace + 'after/;',
			errors: 1,
		},
		{
			code: getMultilineTemplate(nonBreakingSpace),
			output: getMultilineTemplate(escapedNonBreakingSpace),
			errors: 3,
		},
		{
			code: 'const value = `before' + backslash + windowsLinebreak + 'middle' + nonBreakingSpace + 'after`;',
			output: 'const value = `before' + backslash + windowsLinebreak + 'middle' + escapedNonBreakingSpace + 'after`;',
			errors: 1,
		},
	],
});

test({
	valid: [
		{
			code: String.raw`{"value":"\u00A0\u200B"}`,
			language: 'json/json',
			plugins: languages.jsonc.plugins,
		},
		{
			code: '// Comment with \u00A0\n{"value":"\\u00A0"}',
			language: languages.jsonc.language,
			plugins: languages.jsonc.plugins,
		},
		{
			code: '# Comment with \u00A0\nvalue = \'literal \u00A0\'\nquoted = "\\u00A0"',
			language: languages.toml.language,
			plugins: languages.toml.plugins,
		},
	],
	invalid: [
		...['json/json', 'json/jsonc', 'json/json5'].map(language => ({
			code: '{"\u00A0":"before\u200Bafter"}',
			output: String.raw`{"\u00A0":"before\u200Bafter"}`,
			errors: 2,
			language,
			plugins: languages.jsonc.plugins,
		})),
		{
			code: `{"value":"before\\\\${nonBreakingSpace}after"}`,
			output: String.raw`{"value":"before\\\u00A0after"}`,
			errors: 1,
			language: 'json/json',
			plugins: languages.jsonc.plugins,
		},
		{
			code: '{"value":"before\u2028after"}',
			output: String.raw`{"value":"before\u2028after"}`,
			errors: 1,
			language: 'json/json',
			plugins: languages.jsonc.plugins,
		},
		{
			code: '{\'value\':\'before\u202Fafter\'}',
			output: String.raw`{'value':'before\u202Fafter'}`,
			errors: 1,
			language: languages.json5.language,
			plugins: languages.json5.plugins,
		},
		{
			code: `{'value':'before\\\u2028after${nonBreakingSpace}'}`,
			output: '{\'value\':\'before\\\u2028after\\u00A0\'}',
			errors: 1,
			language: languages.json5.language,
			plugins: languages.json5.plugins,
		},
		{
			code: '"\u00A0" = "before\u200Bafter"',
			output: String.raw`"\u00A0" = "before\u200Bafter"`,
			errors: 2,
			language: languages.toml.language,
			plugins: languages.toml.plugins,
		},
		{
			code: '["before\u00A0".child]\nvalue = 1',
			output: '["before\\u00A0".child]\nvalue = 1',
			errors: 1,
			language: languages.toml.language,
			plugins: languages.toml.plugins,
		},
		{
			code: 'value = """before\u2028after"""',
			output: String.raw`value = """before\u2028after"""`,
			errors: 1,
			language: languages.toml.language,
			plugins: languages.toml.plugins,
		},
	],
});
