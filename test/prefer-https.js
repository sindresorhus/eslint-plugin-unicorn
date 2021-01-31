import {test} from './utils/test.js';

test.snapshot({
	valid: [
		'const foo = \'https://sindresorhus.com\';',
		'new URL(\'https://sindresorhus.com\');',
		'const foo = \'http://localhost\''
	],
	invalid: [
		'const foo = \'http://sindresorhus.com\'',
		'new URL(\'http://sindresorhus.com\')'
	]
});
