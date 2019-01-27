import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-textcontent';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	ruleId: 'prefer-textcontent',
	message: 'Prefer `textContent` over `innerText`.'
};

ruleTester.run('prefer-textcontent', rule, {
	valid: [
		'innerText;',
		'node.textContent;',
		'node[\'textContent\'];',
		'node["textContent"];',
		'node[innerText];'
	],
	invalid: [
		{
			code: 'node.innerText;',
			output: 'node.textContent;',
			errors: [error]
		},
		{
			code: 'node[\'innerText\'];',
			output: 'node[\'textContent\'];',
			errors: [error]
		},
		{
			code: 'node["innerText"];',
			output: 'node["textContent"];',
			errors: [error]
		}
	]
});
