import test from 'node:test';
import {Linter} from 'eslint';
import {parseForESLint} from '@typescript-eslint/parser';
import {isBooleanExpression} from '../../rules/utils/is-boolean.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

const linter = new Linter();

/*
Return what `isBooleanExpression` says about the argument of each `inspect(…)` call.
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
									results.push(isBooleanExpression(node.arguments[0], context));
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
