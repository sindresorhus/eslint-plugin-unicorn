import {getTester, normalizeTestCase} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'`UTF-8`',
		'"utf8"',
		'"utf+8"',
		'"   utf8   "',
		'\'utf8\'',
		String.raw`"\u0055tf8"`,
		'const ASCII = 1',
		'const UTF8 = 1',
	],
	invalid: [
		'"UTF-8"',
		'"utf-8"',
		'\'utf-8\'',
		'"Utf8"',
		'"ASCII"',
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
		'`Utf-8`;',
		'"utf-8";',
		'"   Utf8   ";',
		'\'utf-8\';',
		'const utf8 = 2;',
	].map(code => ({code, options: [{withDash: true}]})),
	invalid: [
		'"UTF-8";',
		'"UTF8";',
		'"utf8";',
		'\'utf8\';',
		'"Utf8";',
		'"ASCII";',
		'fs.readFile(file, "utf8",);',
		'whatever.readFile(file, "UTF8",)',
	].map(code => ({code, options: [{withDash: true}]})),
});

const setWithDashOption = (testCase, withDash) => ({
	...normalizeTestCase(testCase, /* shouldNormalizeLanguageOptions */ false),
	options: [{withDash}],
});

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
		setWithDashOption('<meta charset="utf-8" />', true),
		setWithDashOption('<meta charset="utf-8" />', false),
		setWithDashOption('<META CHARSET="utf-8" />', true),
		setWithDashOption('<META CHARSET="utf-8" />', false),
		setWithDashOption('<not-meta charset="utf-8" />', true),
		setWithDashOption('<not-meta notCharset="utf-8" />', true),
		setWithDashOption('<not-meta charset="utf8" />', false),
		setWithDashOption('<not-meta notCharset="utf8" />', false),
	],
	invalid: [
		setWithDashOption('<not-meta charset="utf-8" />', false),
		setWithDashOption('<not-meta notCharset="utf-8" />', false),
		setWithDashOption('<not-meta charset="utf8" />', true),
		setWithDashOption('<not-meta notCharset="utf8" />', true),
		setWithDashOption('<meta charset="ASCII" />', true),
		setWithDashOption('<meta charset="ASCII" />', false),
		setWithDashOption('<META CHARSET="ASCII" />', true),
		setWithDashOption('<META CHARSET="ASCII" />', false),
	],
})
