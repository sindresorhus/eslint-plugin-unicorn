import {getTester, normalizeTestCase} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'`utf8`',
		// eslint-disable-next-line no-template-curly-in-string
		'`UTF-${8}`',
		'`\\u0055tf8`',
		'tag`\\unicode`',
		'"utf8"',
		'"utf+8"',
		'"   utf8   "',
		'\'utf8\'',
		String.raw`"\u0055tf8"`,
		String.raw`foo.replace(/\1/g, _)`,
		'const ASCII = 1',
		'const UTF8 = 1',
	],
	invalid: [
		'"UTF-8"',
		'"utf-8"',
		'\'utf-8\'',
		'"Utf8"',
		'"ASCII"',
		'`UTF-8`',
		'`utf-8`',
		'`Utf8`',
		'`ASCII`',
		'fs.readFile?.(file, "UTF-8")',
		'fs?.readFile(file, "UTF-8")',
		'readFile(file, "UTF-8")',
		'fs.readFile(...file, "UTF-8")',
		'new fs.readFile(file, "UTF-8")',
		'fs.readFile(file, {encoding: "UTF-8"})',
		'fs.readFile("UTF-8")',
		'fs.readFile(file, "UTF-8", () => {})',
		'fs.readFileSync(file, "UTF-8")',
		'fs[readFile](file, "UTF-8")',
		'fs["readFile"](file, "UTF-8")',
		'await fs.readFile(file, "UTF-8",)',
		'fs.promises.readFile(file, "UTF-8",)',
		'whatever.readFile(file, "UTF-8",)',
	],
});

// `withDash` option
test.snapshot({
	valid: [
		'`utf-8`',
		// eslint-disable-next-line no-template-curly-in-string
		'`Utf-${8}`',
		'"utf-8";',
		'"   Utf8   ";',
		'\'utf-8\';',
		String.raw`foo.replace(/\1/g, _)`,
		'const utf8 = 2;',
	].map(code => ({code, options: [{withDash: true}]})),
	invalid: [
		'"UTF-8";',
		'"UTF8";',
		'"utf8";',
		'\'utf8\';',
		'"Utf8";',
		'"ASCII";',
		'`UTF-8`;',
		'`UTF8`;',
		'`utf8`;',
		'`Utf8`;',
		'`ASCII`;',
		'fs.readFile(file, "utf8",);',
		'whatever.readFile(file, "UTF8",)',
	].map(code => ({code, options: [{withDash: true}]})),
});

const setWithDashOption = (testCase, withDash) => ({
	...normalizeTestCase(testCase, /* shouldNormalizeLanguageOptions */ false),
	options: [{withDash}],
});
const withDash = testCase => setWithDashOption(testCase, true);
const noDash = testCase => setWithDashOption(testCase, false);

// Cases requires `utf-8`
test.snapshot({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	},
	valid: [
		withDash('<meta charset="utf-8" />'),
		noDash('<meta charset="utf-8" />'),

		withDash('<META CHARSET="utf-8" />'),
		noDash('<META CHARSET="utf-8" />'),

		withDash('<form acceptCharset="utf-8" />'),
		noDash('<form acceptCharset="utf-8" />'),

		withDash('<form accept-charset="utf-8" />'),
		noDash('<form accept-charset="utf-8" />'),

		withDash('new TextDecoder("utf-8")'),
		noDash('new TextDecoder("utf-8")'),

		withDash('<not-meta charset="utf-8" />'),
		withDash('<not-meta notCharset="utf-8" />'),
		noDash('<not-meta charset="utf8" />'),
		noDash('<not-meta notCharset="utf8" />'),
	],
	invalid: [
		withDash('<meta charset="ASCII" />'),
		noDash('<meta charset="ASCII" />'),

		withDash('<META CHARSET="ASCII" />'),
		noDash('<META CHARSET="ASCII" />'),

		withDash('<meta charset="utf8" />'),
		noDash('<meta charset="utf8" />'),

		withDash('<meta charset="UTF-8" />'),
		noDash('<meta charset="UTF-8" />'),

		withDash('<form acceptCharset="utf8" />'),
		noDash('<form acceptCharset="utf8" />'),

		withDash('<form accept-charset="UTF-8" />'),
		noDash('<form accept-charset="UTF-8" />'),

		withDash('new TextDecoder("UTF-8")'),
		noDash('new TextDecoder("UTF-8")'),

		withDash('new TextDecoder("UTF-8", options)'),
		noDash('new TextDecoder("UTF-8", options)'),

		withDash('<not-meta charset="utf8" />'),
		withDash('<not-meta notCharset="utf8" />'),
		noDash('<not-meta charset="utf-8" />'),
		noDash('<not-meta notCharset="utf-8" />'),
	],
});
