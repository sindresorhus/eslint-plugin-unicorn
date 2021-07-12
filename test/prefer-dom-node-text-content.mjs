import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const errors = [
	{
		message: 'Prefer `.textContent` over `.innerText`.',
	},
];

test({
	valid: [
		'innerText;',
		'node.textContent;',
		'node[innerText];',
		'innerText = true;',
		'node[\'innerText\'];',
		'innerText.textContent',
	],
	invalid: [
		{
			code: 'node.innerText;',
			output: 'node.textContent;',
			errors,
		},
		{
			code: 'node.innerText = \'foo\';',
			output: 'node.textContent = \'foo\';',
			errors,
		},
		{
			code: 'innerText.innerText;',
			output: 'innerText.textContent;',
			errors,
		},
	],
});
