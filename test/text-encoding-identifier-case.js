import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

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
		'`UTF-8`',
		'"utf8"',
		'"utf+8"',
		'"   utf8   "',
		'\'utf8\'',
		String.raw`"\u0055tf8"`,
		'const ASCII = 1',
		'const UTF8 = 1',
		'<meta charset="utf-8" />',
		'<META CHARSET="utf-8" />',
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
		'<not-meta charset="utf-8" />',
		'<meta not-charset="utf-8" />',
		'<meta charset="ASCII" />',
		'<META CHARSET="ASCII" />',
	],
});

// `withDash` option
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
		'`Utf-8`;',
		'"utf-8";',
		'"   Utf8   ";',
		'\'utf-8\';',
		'const utf8 = 2;',
		'<meta charset="utf-8" id="with-dash"/>',
		'<META CHARSET="utf-8" id="with-dash"/>',
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
		'<meta charset="utf8" id="with-dash"/>',
		'<META CHARSET="utf8" id="with-dash"/>',
		'<not-meta charset="utf8" id="with-dash"/>',
		'<meta not-charset="utf8" id="with-dash"/>',
	].map(code => ({code, options: [{withDash: true}]})),
});
