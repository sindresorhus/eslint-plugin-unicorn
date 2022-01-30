import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const createError = messageId => [
	{
		messageId
	}
]

const expectedBraces = createError('switch-braces-expected');
const unexpectedBraces = createError('switch-braces-unexpected');

test({
	valid: [
		'switch (foo) { case 1: { break; } }'
	],
	invalid: [
		{
			code: 'switch (foo) { case 1: break; }',
			errors: expectedBraces,
			output: 'switch (foo) { case 1: {break;} }'
		},
		{
			code: 'switch (foo) { case 1: {break;} }',
			errors: unexpectedBraces,
			options: ['never'],
			output: 'switch (foo) { case 1: break; }'
		},
		{
			code: outdent`
				switch (foo) {
					case 1: {
						break;
					}
				}
			`,
			errors: unexpectedBraces,
			options: ['never'],
			output: outdent`
				switch (foo) {
					case 1:
						break;
					
				}
			`
		},
		{
			code: outdent`
				switch (foo) {
					case 1:
						break;
				}
			`,
			errors: expectedBraces,
			output: outdent`
				switch (foo) {
					case 1: {
						break;
					}
				}
			`
		},
	]
})
