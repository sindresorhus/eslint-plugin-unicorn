/* eslint-disable no-template-curly-in-string */
import test from 'node:test';
import * as espree from 'espree';
import {Linter} from 'eslint';
import {
	isProcessExitBlockAtStart,
	isProcessExitBranch,
	isProcessExitBranchAtStart,
} from '../../rules/utils/index.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

const lastStatement = program => program.body.at(-1);
const firstStatementInFunction = program => program.body.at(-1).body.body[0];
const labeledStatementBody = program => program.body.at(-1).body;

const evaluate = (code, check, {pick = lastStatement, languageOptions} = {}) => {
	let result;

	const messages = linter.verify(code, {
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			...languageOptions,
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'Program:exit'(program) {
								result = check(pick(program), context);
							},
						}),
					},
				},
			},
		},
		rules: {
			'test/capture': 'error',
		},
	});
	if (messages.length > 0) {
		throw new Error(messages.map(message => message.message).join('\n'));
	}

	return result;
};

const checkers = {
	isProcessExitBranch: (node, context) => isProcessExitBranch(node, context),
	isProcessExitBranchWithoutTryStatements: (node, context) => isProcessExitBranch(node, context, false),
	isProcessExitBranchAtStart: (node, context) => isProcessExitBranchAtStart(node, context),
	isProcessExitBlockAtStart: (node, context) => isProcessExitBlockAtStart(node, context),
};

const runCases = (checkerName, cases) => {
	for (const [code, expected, options] of cases) {
		test(`${checkerName}: ${code}`, t => {
			t.assert.strictEqual(evaluate(code, checkers[checkerName], options), expected);
		});
	}
};

// Logical assignments only evaluate the right side when the left side is statically known
runCases('isProcessExitBranch', [
	['const value = 1; value &&= process.exit();', true],
	['const value = 0; value &&= process.exit();', false],
	['const value = 0; value ||= process.exit();', true],
	['const value = 1; value ||= process.exit();', false],
	['const value = null; value ??= process.exit();', true],
	['const value = 1; value ??= process.exit();', false],
	['let value; value ??= process.exit();', false],
	['undeclared ||= process.exit();', false],
]);

// Detects `process.exit()` in expressions
runCases('isProcessExitBranch', [
	['process.exit() ? a : b;', true],
	['true ? process.exit() : a;', true],
	['false ? a : process.exit();', true],
	['true ? a : process.exit();', false],
	['({...process.exit()});', true],
	['({[process.exit()]: 1});', true],
	['({key: process.exit()});', true],
	['({[key]: 1});', false],
	['import(process.exit());', true],
	['process.exit()`template`;', true],
	['String.raw`${process.exit()}`;', true],
	['String.raw`${value}`;', false],
	['undeclared`${process.exit()}`;', false],
	['function * generator() { yield process.exit(); }', true, {pick: firstStatementInFunction}],
	['function * generator() { yield; }', false, {pick: firstStatementInFunction}],
	['function function_() { return process.exit(); }', true, {pick: firstStatementInFunction}],
	['function function_() { return; }', false, {pick: firstStatementInFunction}],
	['switch (process.exit()) {}', true],
]);

// Detects `process.exit()` in classes
runCases('isProcessExitBranch', [
	['class Foo extends process.exit() {}', true],
	['class Foo extends undeclared { static value = process.exit(); }', false],
	['class Foo extends null { static value = process.exit(); }', true],
	['class Foo { [process.exit()]() {} }', true],
	['class Foo { static { process.exit(); } }', true],
	['class Foo { static { foo(); } }', false],
	['class Foo { value = process.exit(); }', false],
]);

// Detects `process.exit()` at the start of expressions
runCases('isProcessExitBranchAtStart', [
	['let first, second = process.exit();', true],
	['foo?.(process.exit());', false],
	['foo.bar?.baz(process.exit());', false],
	['({...process.exit()});', true],
	['({[process.exit()]: 1});', true],
	['({...{}, key: process.exit()});', true],
	['({...undeclared, key: process.exit()});', false],
	['[, process.exit()];', true],
	['undeclared`${process.exit()}`;', false],
	['String.raw`${process.exit()}`;', true],
	['process.exit() ? a : b;', true],
	['process.exit() + 1;', true],
	['1 + process.exit();', true],
	['undeclared + process.exit();', false],
	['(process.exit() as never);', true, {languageOptions: {parser: parsers.typescript.implementation}}],
	['if (process.exit()) {}', true],
	['function function_() { if (false) return; process.exit(); }', true, {pick: program => program.body.at(-1).body}],
]);

// Detects `process.exit()` at the start of loops and classes
runCases('isProcessExitBranchAtStart', [
	['for (process.exit();;) {}', true],
	['for (let index = process.exit();;) {}', true],
	['let index; for (index = 0; process.exit();) {}', true],
	['for (undeclared(); process.exit();) {}', false],
	['class Foo { method() {} static value = process.exit(); }', true],
	['class Foo { value = 1; static value = process.exit(); }', true],
	['class Foo { static value; static other = process.exit(); }', true],
	['class Foo { static value = foo(); static other = process.exit(); }', false],
]);

// A label redeclared inside a class static block does not hide `process.exit()`
runCases('isProcessExitBranch', [
	['label: { class Foo { static { label: { break label; } } } process.exit(); }', true],
]);

// Do-while loops with control flow before the test
runCases('isProcessExitBranch', [
	['let condition; do { foo(); if (condition) continue; process.exit(); } while (bar);', false],
	['do { foo(); } while (process.exit());', false],
	['do { while (true) foo(); } while (process.exit());', false],
]);

runCases('isProcessExitBranchWithoutTryStatements', [
	['do { while (true) { foo(); break; } } while (process.exit());', true],
	['let value; outer: do { switch (value) { case 1: break outer; } } while (process.exit());', false, {pick: labeledStatementBody}],
	['let value; outer: for (;;) { do { switch (value) { case 1: continue outer; } } while (process.exit()); }', false, {pick: program => program.body.at(-1).body.body.body[0]}],
	['let value; do { switch (value) { case 1: break; } } while (process.exit());', true],
]);

// Nested functions are skipped when looking for control flow
runCases('isProcessExitBranch', [
	['label: { foo(() => { label: { break label; } }); process.exit(); }', true],
	['do { foo(() => {}); process.exit(); } while (bar);', true],
	['let value; switch (value) { case 1: foo(() => {}); default: process.exit(); }', true],
]);

runCases('isProcessExitBranchWithoutTryStatements', [
	['let value; do { switch (value) { case 1: foo(() => {}); } } while (process.exit());', true],
]);

// Assignments to nullish member objects may throw before `process.exit()`
runCases('isProcessExitBranchAtStart', [
	['{ undefined.value = 1; process.exit(); }', false],
	['{ null.value = 1; process.exit(); }', false],
	['{ ({}).value = 1; process.exit(); }', true],
	['class Foo { static value = 1; }', false],
]);

/*
A parser that turns `custom;` statements into a node type that its visitor keys do not know about.
*/
const parserWithUnknownNodeType = {
	parseForESLint(code) {
		const ast = espree.parse(code, {
			ecmaVersion: 'latest',
			sourceType: 'module',
			range: true,
			loc: true,
			tokens: true,
			comment: true,
		});

		const visit = node => {
			if (node.type === 'ExpressionStatement' && node.expression.type === 'Identifier' && node.expression.name === 'custom') {
				node.type = 'CustomStatement';
			}

			for (const key of espree.VisitorKeys[node.type] ?? []) {
				for (const child of [node[key]].flat()) {
					if (child) {
						visit(child);
					}
				}
			}
		};

		visit(ast);

		return {ast, visitorKeys: espree.VisitorKeys};
	},
};

// Node types without visitor keys are treated as having no children
const unknownNodeTypeOptions = {languageOptions: {parser: parserWithUnknownNodeType}};

runCases('isProcessExitBranch', [
	['label: { custom; process.exit(); }', true, unknownNodeTypeOptions],
	['do { custom; } while (process.exit());', false, unknownNodeTypeOptions],
	['let value; switch (value) { case 1: custom; default: process.exit(); }', true, unknownNodeTypeOptions],
]);

runCases('isProcessExitBranchWithoutTryStatements', [
	['let value; do { switch (value) { case 1: custom; } } while (process.exit());', true, unknownNodeTypeOptions],
]);

// A static block only exits when the class heritage is evaluated without throwing
const firstClassElement = program => program.body.at(-1).body.body[0];

runCases('isProcessExitBlockAtStart', [
	['class Foo { static { process.exit(); } }', true, {pick: firstClassElement}],
	['class Foo extends null { static { process.exit(); } }', true, {pick: firstClassElement}],
	['class Foo extends process.exit() { static { process.exit(); } }', true, {pick: firstClassElement}],
	['class Foo extends undeclared { static { process.exit(); } }', false, {pick: firstClassElement}],
]);
