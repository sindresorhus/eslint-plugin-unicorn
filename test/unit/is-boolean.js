import test from 'node:test';
import {Linter} from 'eslint';
import {parseForESLint} from '@typescript-eslint/parser';
import {isBooleanExpression, isFunctionTypeAnnotation} from '../../rules/utils/is-boolean.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

const linter = new Linter();

/*
Return the inspection result for the argument of each `inspect(…)` call, using `isBooleanExpression` by default.
*/
const getResults = (code, {typeAware = false, parser = typescriptEslintParser, inspect = isBooleanExpression} = {}) => {
	const results = [];
	const messages = linter.verify(code, {
		files: ['**/*.ts'],
		languageOptions: {
			parser,
			parserOptions: typeAware ? {projectService: {allowDefaultProject: ['*.ts']}} : {},
		},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							CallExpression(node) {
								if (node.callee.name === 'inspect') {
									results.push(inspect(node.arguments[0], context));
								}
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	}, 'file.ts');

	if (messages.length > 0) {
		throw new Error(messages.map(message => message.message).join('\n'));
	}

	return results;
};

test('resolves type annotations that reference other types', t => {
	for (const [code, expected] of [
		['type Flag = boolean; function foo(value: Flag) { inspect(value); }', true],
		['class Flag {} function foo(value: Flag) { inspect(value); }', false],
		['function foo(value: Flag) { inspect(value); }', false],
	]) {
		t.assert.deepStrictEqual(getResults(code), [expected], code);
	}
});

test('sees through TypeScript wrappers around known receivers', t => {
	for (const [code, expected] of [
		['inspect(new Set()!.has(value));', true],
		['inspect((new Set() as Set<number>).has(value));', true],
		['inspect((<Set<number>>new Set()).has(value));', true],
		['inspect((new Set() satisfies Set<number>).has(value));', true],
		['inspect((new Set() as Set<number>).add(value));', false],
	]) {
		t.assert.deepStrictEqual(getResults(code), [expected], code);
	}
});

test('treats a type information error as not boolean', t => {
	const parser = {
		parseForESLint(code, options) {
			const result = parseForESLint(code, options);
			return {
				...result,
				services: {
					...result.services,
					program: {},
					getTypeAtLocation() {
						throw new Error('Type information failed');
					},
				},
			};
		},
	};

	t.assert.deepStrictEqual(getResults('inspect(foo);', {parser}), [false]);
});

test('resolves distinct same-named aliases while stopping recursive aliases', t => {
	for (const [code, expected] of [
		['type Flag = boolean; type Alias = Flag; function foo() { type Flag = Alias; let value: Flag; inspect(value); }', true],
		['type Flag = boolean; type Alias = Flag; function foo() { type Flag = Alias; function predicate(): Flag {} inspect(predicate()); }', true],
		['type Predicate = () => boolean; type Alias = Predicate; function foo() { type Predicate = Alias; let predicate: Predicate; inspect(predicate()); }', true],
		['type Flag = string; type Alias = Flag; function foo() { type Flag = Alias; let value: Flag; inspect(value); }', false],
		['type Flag = Flag; function foo(value: Flag) { inspect(value); }', false],
		['type First = Second; type Second = First; function foo(value: First) { inspect(value); }', false],
		['type Flag = boolean; function foo(value: Flag | Flag) { inspect(value); }', true],
	]) {
		t.assert.deepStrictEqual(getResults(code), [expected], code);
	}
});

test('resolves scoped function type aliases without rejecting repeated names', t => {
	const inspect = (node, context) => isFunctionTypeAnnotation(node.typeAnnotation, context, context.sourceCode.getScope(node));
	for (const [code, expected] of [
		['type Predicate = () => boolean; type Alias = Predicate; function foo() { type Predicate = Alias; inspect(undefined as Predicate); }', true],
		['type Predicate = string; type Alias = Predicate; function foo() { type Predicate = Alias; inspect(undefined as Predicate); }', false],
		['type Predicate = Predicate; inspect(undefined as Predicate);', false],
		['type First = Second; type Second = First; inspect(undefined as First);', false],
	]) {
		t.assert.deepStrictEqual(getResults(code, {inspect}), [expected], code);
	}
});

test('terminates on cyclic variable and function references', t => {
	for (const [code, expected] of [
		['const value = value; inspect(value);', false],
		['const first = second; const second = first; inspect(first);', false],
		['const first = second; const second = first; inspect(first.includes(1));', false],
		['function first() { return second(); } function second() { return first(); } inspect(first());', false],
		['const predicate = () => predicate(); inspect(predicate());', false],
		['const value = true; const alias = value; inspect(alias && alias);', true],
		['function predicate() { return true; } const value = predicate(); inspect(value && value);', true],
	]) {
		t.assert.deepStrictEqual(getResults(code), [expected], code);
	}
});
