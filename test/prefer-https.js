/* eslint-disable unicorn/prefer-https */
import {test} from './utils/test.js';

const MESSAGE_ID = 'prefer-https';

const createError = (value, replacement) => [
	{
		messageId: MESSAGE_ID,
		data: {
			value,
			replacement
		}
	}
];

const testCase = (code, output) => ({
	code,
	output,
	errors: createError(code, output)
});

test({
	valid: [
		'const foo = \'https://sindresorhus.com\';',
		'new URL(\'https://sindresorhus.com\');',
		'const foo = \'http\'',
		'const foo = \'http://www.google\'',
		'const foo = \'http://localhost\'',
		'const foo = { \'http://sindresorhus.com\': \'foo\' }'
	],
	invalid: [
		testCase(
			'const foo = \'http://sindresorhus.com\';',
			'const foo = \'https://sindresorhus.com\';'
		),
		testCase(
			'new URL(\'http://sindresorhus.com\');',
			'new URL(\'https://sindresorhus.com\');'
		),
		testCase(
			'// Foo bar http is good: http://asdasd.com',
			'// Foo bar http is good: https://asdasd.com'
		),
		testCase(
			'const foo = `http://sindresorhus.com`',
			'const foo = `https://sindresorhus.com`'
		)
	]
});
