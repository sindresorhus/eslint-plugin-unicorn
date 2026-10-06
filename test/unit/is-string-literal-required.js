import test from 'node:test';
import {Linter} from 'eslint';
import {isStringLiteralRequired} from '../../rules/utils/index.js';
import parsers from '../utils/parsers.js';

/*
Return the `isStringLiteralRequired` result for each `'x'` string literal.
*/
const getResults = (code, {typescript = false} = {}) => {
	const results = [];
	const linter = new Linter();
	const messages = linter.verify(code, {
		files: ['**'],
		languageOptions: typescript
			? {
				parser: parsers.typescript.implementation,
				parserOptions: parsers.typescript.mergeParserOptions(),
			}
			: {parserOptions: {ecmaFeatures: {jsx: true}}},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'Literal[value="x"]'(node) {
								results.push(isStringLiteralRequired(node));
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	}, {filename: typescript ? 'file.ts' : 'file.jsx'});

	const fatalMessage = messages.find(message => message.fatal);
	if (fatalMessage) {
		throw new Error(fatalMessage.message);
	}

	return results;
};

test('returns `true` where the syntax requires a string literal', t => {
	for (const code of [
		'\'x\';',
		'function foo() { \'x\'; }',
		'({\'x\': 1});',
		'({\'x\'() {}});',
		'class A { \'x\' = 1; }',
		'class A { \'x\'() {} }',
		'import \'x\';',
		'import foo from \'x\';',
		'export {foo} from \'x\';',
		'export * from \'x\';',
		'import foo from \'foo\' with {\'x\': \'y\'};',
		'import foo from \'foo\' with {type: \'x\'};',
		'import {\'x\' as foo} from \'foo\';',
		'const foo = 1; export {foo as \'x\'};',
		'export {\'x\' as foo} from \'foo\';',
		'export * as \'x\' from \'foo\';',
		'<div foo=\'x\' />;',
	]) {
		t.assert.deepStrictEqual(getResults(code), [true], code);
	}
});

test('returns `true` where the TypeScript syntax requires a string literal', t => {
	for (const code of [
		'abstract class A { abstract \'x\': string; }',
		'abstract class A { abstract \'x\'(): void; }',
		'abstract class A { abstract accessor \'x\': string; }',
		'class A { accessor \'x\' = 1; }',
		'interface A { \'x\': string; }',
		'interface A { \'x\'(): void; }',
		'enum A { \'x\' = 1 }',
		'enum A { B = \'x\' }',
		'declare module \'x\' {}',
		'import foo = require(\'x\');',
		'type A = \'x\';',
		'type A = import(\'x\');',
	]) {
		t.assert.deepStrictEqual(getResults(code, {typescript: true}), [true], code);
	}
});

test('returns `false` where any expression is allowed', t => {
	for (const code of [
		'foo(\'x\');',
		'const foo = \'x\';',
		'({[\'x\']: 1});',
		'({foo: \'x\'});',
		'class A { [\'x\'] = 1; }',
		'class A { foo = \'x\'; }',
		'import(\'x\');',
		'<div foo={\'x\'} />;',
		'foo[\'x\'];',
		'function foo() { bar(); \'x\'; }',
	]) {
		t.assert.deepStrictEqual(getResults(code), [false], code);
	}
});
