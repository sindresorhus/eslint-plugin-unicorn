import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/no-process-exit';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const errors = [
	{
		ruleId: 'no-process-exit',
		message: 'Only use `process.exit()` in CLI apps. Throw an error instead.'
	}
];

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
		outdent`
			const {workerData, parentPort} = require('worker_threads');
			process.exit(1);
		`,
		outdent`
			import {workerData, parentPort} from 'worker_threads';
			process.exit(1);
		`,
		outdent`
			import foo from 'worker_threads';
			process.exit(1);
		`,
		// Not `CallExpression`
		'new process.exit(1);',
		// Not `MemberExpression`
		'exit(1);',
		// `callee.property` is not a `Identifier`
		'process["exit"](1);',
		// Computed
		'process[exit](1);',
		// Not exit
		'process.foo(1);',
		// Not `process`
		'foo.exit(1);',
		// `callee.object.type` is not a `Identifier`
		'lib.process.exit(1);'
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
			code: outdent`
				const mod = require('not_worker_threads');
				process.exit(1);
			`,
			errors
		},
		{
			code: outdent`
				import mod from 'not_worker_threads';
				process.exit(1);
			`,
			errors
		},

		// Not `CallExpression`
		{
			code: outdent`
				const mod = new require('worker_threads');
				process.exit(1);
			`,
			errors
		},
		// Not `Literal` worker_threads
		{
			code: outdent`
				const mod = require(worker_threads);
				process.exit(1);
			`,
			errors
		},

		// Not `CallExpression`
		{
			code: 'new process.on("SIGINT", function() { process.exit(1); })',
			errors
		},
		{
			code: 'new process.once("SIGINT", function() { process.exit(1); })',
			errors
		},
		// Not `MemberExpression`
		{
			code: 'on("SIGINT", function() { process.exit(1); })',
			errors
		},
		{
			code: 'once("SIGINT", function() { process.exit(1); })',
			errors
		},
		// `callee.property` is not a `Identifier`
		{
			code: 'process["on"]("SIGINT", function() { process.exit(1); })',
			errors
		},
		{
			code: 'process["once"]("SIGINT", function() { process.exit(1); })',
			errors
		},
		// Computed
		{
			code: 'process[on]("SIGINT", function() { process.exit(1); })',
			errors
		},
		{
			code: 'process[once]("SIGINT", function() { process.exit(1); })',
			errors
		},
		// Not `on` / `once`
		{
			code: 'process.foo("SIGINT", function() { process.exit(1); })',
			errors
		},
		// Not `process`
		{
			code: 'foo.on("SIGINT", function() { process.exit(1); })',
			errors
		},
		{
			code: 'foo.once("SIGINT", function() { process.exit(1); })',
			errors
		},
		// `callee.object.type` is not a `Identifier`
		{
			code: 'lib.process.on("SIGINT", function() { process.exit(1); })',
			errors
		},
		{
			code: 'lib.process.once("SIGINT", function() { process.exit(1); })',
			errors
		}
	]
});
