import {getTester} from './utils/test.js';

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

// JSX
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
		'<meta charset="utf-8" />',
		'<META CHARSET="utf-8" />',
	],
	invalid: [
		'<not-meta charset="utf-8" />',
		'<meta not-charset="utf-8" />',
		'<meta charset="ASCII" />',
		'<META CHARSET="ASCII" />',
	],
});
