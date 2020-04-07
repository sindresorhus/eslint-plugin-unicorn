import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-text-content';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [
	{
		message: 'Prefer `.textContent` over `.innerText`.'
	}
];

ruleTester.run('prefer-text-content', rule, {
	valid: [
		'innerText;',
		'node.textContent;',
		'node[innerText];',
		'innerText = true;',
		'node[\'innerText\'];',
		'innerText.textContent'
	],
	invalid: [
		{
			code: 'node.innerText;',
			output: 'node.textContent;',
			errors
		},
		{
			code: 'node.innerText = \'foo\';',
			output: 'node.textContent = \'foo\';',
			errors
		},
		{
			code: 'innerText.innerText;',
			output: 'innerText.textContent;',
			errors
		}
	]
});
