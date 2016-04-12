import test from 'ava';
import {RuleTester} from 'eslint';
import rule from '../rules/no-process-exit';

const ruleTester = new RuleTester({
	env: {
		es6: true
	}
});

const errors = [{ruleId: 'no-process-exit'}];

test(() => {
	ruleTester.run('no-process-exit', rule, {
		valid: [
			'#!/usr/bin/env node\n\nprocess.exit();',
			'Process.exit()',
			'const x = process.exit;',
			'x(process.exit)',
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
