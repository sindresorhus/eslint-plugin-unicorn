import test from 'node:test';
import {Linter} from 'eslint';
import {isReferenceIdentifier} from '../../rules/ast/index.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

/*
Return whether each identifier named `Identifier` in `code` is a reference.
*/
const getVerdicts = (code, nameOrNames) => {
	const verdicts = [];

	const messages = linter.verify(code, {
		files: ['**'],
		languageOptions: {
			parser: parsers.typescript.implementation,
			parserOptions: parsers.typescript.mergeParserOptions(),
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: () => ({
							'Identifier[name="Identifier"]'(node) {
								verdicts.push(isReferenceIdentifier(node, nameOrNames));
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	}, {filename: 'file.ts'});

	const fatalMessage = messages.find(message => message.fatal);
	if (fatalMessage) {
		throw new Error(fatalMessage.message);
	}

	return verdicts;
};

test('identifiers that are not references', t => {
	for (const code of [
		'const [Identifier] = [];',
		'Identifier: for (;;) { continue Identifier; }',
		'Identifier: for (;;) { break Identifier; }',
		'import Identifier from \'foo\';',
		'import * as Identifier from \'foo\';',
		'export * as Identifier from \'foo\';',
		'import {Identifier} from \'foo\';',
		'import {foo as Identifier} from \'foo\';',
		'const foo = 1; export {foo as Identifier};',
		'export {Identifier as foo};',
		'declare function Identifier(): void;',
		'enum Foo { Identifier }',
		'type Foo = {[Identifier: string]: string};',
		'type Foo = {[Identifier in keyof string]: number};',
		'type Foo = {Identifier: string};',
	]) {
		const verdicts = getVerdicts(code);

		t.assert.ok(verdicts.length > 0, code);
		t.assert.ok(verdicts.every(verdict => verdict === false), code);
	}
});

test('identifiers that are references', t => {
	for (const code of [
		'foo(Identifier);',
		'foo[Identifier];',
		'const {[Identifier]: foo} = {};',
		'type Foo = {[Identifier]: string};',
	]) {
		t.assert.deepStrictEqual(getVerdicts(code), [true], code);
	}
});

test('a type parameter usage is a reference', t => {
	t.assert.deepStrictEqual(getVerdicts('type Foo<Identifier> = Identifier[];'), [false, true]);
});

test('only matches the given names', t => {
	t.assert.deepStrictEqual(getVerdicts('foo(Identifier);', 'Identifier'), [true]);
	t.assert.deepStrictEqual(getVerdicts('foo(Identifier);', ['foo', 'Identifier']), [true]);
	t.assert.deepStrictEqual(getVerdicts('foo(Identifier);', 'foo'), [false]);
});
