import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-node-append';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const errors = [
	{
		message: 'Prefer `Node#append()` over `Node#appendChild()`.'
	}
];

ruleTester.run('prefer-node-append', rule, {
	valid: [
		'parent.append(child);',
		'document.body.append(child, \'text\');',
		'node.append()',
		'node.append(null)'
	],
	invalid: [
		{
			code: 'node.appendChild(child);',
			output: 'node.append(child);',
			errors
		},
		{
			code: 'document.body.appendChild(child);',
			output: 'document.body.append(child);',
			errors
		},
		{
			code: 'node.appendChild()',
			output: 'node.append()',
			errors
		},
		{
			code: 'node.appendChild(null)',
			output: 'node.append(null)',
			errors
		}
	]
});
