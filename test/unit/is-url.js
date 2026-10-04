import test from 'node:test';
import {Linter} from 'eslint';
import {parseForESLint} from '@typescript-eslint/parser';
import isUrl from '../../rules/utils/is-url.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

const linter = new Linter();

/*
Return what `isUrl` says about the argument of each `inspect(…)` call.
*/
const getResults = (code, {typeAware = false, parser = typescriptEslintParser} = {}) => {
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
									results.push(isUrl(node.arguments[0], context));
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

test('resolves type annotations', t => {
	for (const [code, expected] of [
		['function foo(value: URL | Foo) { inspect(value); }', false],
		['function foo(value: URL | URL) { inspect(value); }', true],
		['type First = Second; type Second = First; function foo(value: First) { inspect(value); }', false],
		['function foo(value: import(\'node:url\').URL) { inspect(value); }', true],
		['function foo(value: import(\'node:url\')) { inspect(value); }', false],
		['function foo(value: import(\'other\').URL) { inspect(value); }', false],
		['function foo(value: URL & {brand: true}) { inspect(value); }', false],
		['function foo(value: URL & Foo) { inspect(value); }', false],
		['function foo(value: {first: true} & {second: true}) { inspect(value); }', false],
		['class Foo {} function foo(value: Foo) { inspect(value); }', false],
	]) {
		t.assert.deepStrictEqual(getResults(code), [expected], code);
	}
});

test('handles constructors that are not identifiers', t => {
	t.assert.deepStrictEqual(getResults('inspect(new foo.URL(\'https://example.com\'));'), [false]);
});

test('resolves types from type information', t => {
	for (const [code, expected] of [
		['declare const holder: {get<T extends {url: URL}>(object: T): T[\'url\']}; function foo<T extends {url: URL}>(object: T) { inspect(holder.get(object)); }', true],
		['declare const object: {url: URL & {brand: true}}; inspect(object.url);', false],
		['declare const object: {url: URL & {brand: true} | string}; inspect(object.url);', false],
		['inspect(new globalThis.URL(\'https://example.com\'));', true],
		['inspect(new globalThis.Date());', false],
		['function foo<T extends URL>(value: T) { inspect(value); }', false],
	]) {
		t.assert.deepStrictEqual(getResults(code, {typeAware: true}), [expected], code);
	}
});

test('treats a type information error as unknown', t => {
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

test('resolves different aliases with the same name', t => {
	t.assert.deepStrictEqual(getResults('type Value = URL; type Alias = Value; { type Value = Alias; function foo(value: Value) { inspect(value); } }'), [true]);
});

test('terminates recursive aliases and checks repeated concrete branches', t => {
	t.assert.deepStrictEqual(getResults('type Cycle = Cycle; function foo(value: Cycle) { inspect(value); }'), [false]);
	t.assert.deepStrictEqual(getResults('type Value = URL; type Either = Value | Value; function foo(value: Either) { inspect(value); }'), [true]);
	t.assert.deepStrictEqual(getResults('type Value = number; type Alias = Value; { type Value = Alias; function foo(value: Value) { inspect(value); } }'), [false]);
});
