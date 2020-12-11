import {outdent} from 'outdent';
import {test} from './utils/test';

const MESSAGE_ID = 'prefer-date-now';
const errors = [
	{
		messageId: MESSAGE_ID
	}
];

test({
	valid: [
		'const foo = \'🦄\';'
	],
	invalid: [
		{
			code: outdent`
				const foo = 'unicorn';
			`,
			output: outdent`
				const foo = '🦄';
			`,
			errors
		}
	]
});

test.visualize([
	'const foo = \'unicorn\';'
]);
