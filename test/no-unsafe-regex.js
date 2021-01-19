import {test} from './utils/test.js';

const error = {
	messageId: 'no-unsafe-regex'
};

test({
	valid: [
		'const foo = /\bunicorn\b/',
		'const foo = /\bunicorn\b/g',
		'const foo = new RegExp(\'^\bunicorn\b\')',
		'const foo = new RegExp(\'^\bunicorn\b\', \'i\')',
		'const foo = new RegExp(/\bunicorn\b/)',
		'const foo = new RegExp(/\bunicorn\b/g)',
		'const foo = new RegExp()'
	],
	invalid: [
		{
			code: 'const foo = /(x+x+)+y/',
			errors: [error]
		},
		{
			code: 'const foo = /(x+x+)+y/g',
			errors: [error]
		},
		{
			code: 'const foo = new RegExp(\'(x+x+)+y\')',
			errors: [error]
		},
		{
			code: 'const foo = new RegExp(\'(x+x+)+y\', \'g\')',
			errors: [error]
		},
		{
			code: 'const foo = new RegExp(/(x+x+)+y/)',
			errors: [error]
		},
		{
			code: 'const foo = new RegExp(/(x+x+)+y/g)',
			errors: [error]
		}
	]
});

test.snapshot([
	'const foo = /(x+x+)+y/g'
]);
