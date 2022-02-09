import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'`UTF-8`',
		'"utf8"',
		'"utf+8"',
		'"   utf8   "',
		'\'utf8\'',
		'"\\u0055tf8"',
		'const ASCII = 1',
		'const UTF8 = 1',
	],
	invalid: [
		'"UTF-8"',
		'"utf-8"',
		'\'utf-8\'',
		'"Utf8"',
		'"ASCII"',
		'await fs.readFile(file, "UTF-8",)',
	],
});
