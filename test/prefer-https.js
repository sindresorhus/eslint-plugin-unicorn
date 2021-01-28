import {outdent} from 'outdent';
import {test} from './utils/test.js';

const MESSAGE_ID = 'prefer-https';
const errors = [
	{
		messageId: MESSAGE_ID
	}
];

test({
	valid: [
		`const foo = 'https://sindresorhus.com';`,
		`new URL('https://sindresorhus.com');`,
		`const foo = 'http://localhost'`,
	],
	invalid: [
		{
			code: outdent`
				const foo = 'http://sindresorhus.com';
			`,
			output: outdent`
				new URL('http://sindresorhus.com');
			`,
			errors
		}
	]
});
