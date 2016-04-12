import test from 'ava';
import {RuleTester} from 'eslint';
import rule from '../rules/no-process-exit';

const ruleTester = new RuleTester({
	env: {
		es6: true
	}
});

const errors = [{
	ruleId: 'no-process-exit',
	message: 'Only use process.exit() in CLI apps. Throw an error instead.',
	type: 'CallExpression'
}];

test(() => {
	ruleTester.run('no-process-exit', rule, {
		valid: [
			'Process.exit()',
			'const exit = process.exit;',
			'x(process.exit)',
			'#!/usr/bin/env node\nprocess.exit(0);',
			''
		],
		invalid: [
			{
				code: 'process.exit();',
				errors
			},
			{
				code: 'process.exit(1);',
				errors
			},
			{
				code: 'x(process.exit(1));',
				errors
			}
		]
	});
});
