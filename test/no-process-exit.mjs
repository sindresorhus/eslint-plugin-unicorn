import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const errors = [
	{
		messageId: 'no-process-exit',
	},
];

test({
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
		'lib.process.exit(1);',
	],
	invalid: [
		'process.exit();',
		'process.exit(1);',
		'x(process.exit(1));',
		outdent`
			const mod = require('not_worker_threads');
			process.exit(1);
		`,
		outdent`
			import mod from 'not_worker_threads';
			process.exit(1);
		`,

		// Not `CallExpression`
		outdent`
			const mod = new require('worker_threads');
			process.exit(1);
		`,
		// Not `Literal` worker_threads
		outdent`
			const mod = require(worker_threads);
			process.exit(1);
		`,

		// Not `CallExpression`
		'new process.on("SIGINT", function() { process.exit(1); })',
		'new process.once("SIGINT", function() { process.exit(1); })',
		// Not `MemberExpression`
		'on("SIGINT", function() { process.exit(1); })',
		'once("SIGINT", function() { process.exit(1); })',
		// `callee.property` is not a `Identifier`
		'process["on"]("SIGINT", function() { process.exit(1); })',
		'process["once"]("SIGINT", function() { process.exit(1); })',
		// Computed
		'process[on]("SIGINT", function() { process.exit(1); })',
		'process[once]("SIGINT", function() { process.exit(1); })',
		// Not `on` / `once`
		'process.foo("SIGINT", function() { process.exit(1); })',
		// Not `process`
		'foo.on("SIGINT", function() { process.exit(1); })',
		'foo.once("SIGINT", function() { process.exit(1); })',
		// `callee.object.type` is not a `Identifier`
		'lib.process.on("SIGINT", function() { process.exit(1); })',
		'lib.process.once("SIGINT", function() { process.exit(1); })',
	].map(code => ({code, errors})),
});

test.snapshot({
	valid: [],
	invalid: [
		'process.exit(1);',
	],
});
