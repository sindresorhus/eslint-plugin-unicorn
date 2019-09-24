import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-process-exit';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const errors = [{
	ruleId: 'no-process-exit',
	message: 'Only use `process.exit()` in CLI apps. Throw an error instead.'
}];

ruleTester.run('no-process-exit', rule, {
	valid: [
		'#!/usr/bin/env node\n\nprocess.exit();',
		'Process.exit()',
		'const x = process.exit;',
		'x(process.exit)',
		'process.on("SIGINT", function() { process.exit(1); })',
		'process.on("SIGKILL", function() { process.exit(1); })',
		'process.on("SIGINT", () => { process.exit(1); })',
		'process.on("SIGINT", () => process.exit(1))',
		'process.on("SIGINT", () => { if (true) { process.exit(1); } })',
		'process.once("SIGINT", function() { process.exit(1); })',
		'process.once("SIGKILL", function() { process.exit(1); })',
		'process.once("SIGINT", () => { process.exit(1); })',
		'process.once("SIGINT", () => process.exit(1))',
		'process.once("SIGINT", () => { if (true) { process.exit(1); } })',
		'const {workerData, parentPort} = require(\'worker_threads\')\n\nprocess.exit(1);',
		'import {workerData, parentPort} from \'worker_threads\'\n\nprocess.exit(1);',
		'import foo from \'worker_threads\'\n\nprocess.exit(1);',
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
		},
		{
			code: 'const mod = require(\'not_worker_threads\');\n\nprocess.exit(1);',
			errors
		},
		{
			code: 'import mod from \'not_worker_threads\';\n\nprocess.exit(1);',
			errors
		}
	]
});
