import test from 'node:test';
import {Linter} from 'eslint';
import {getBuiltinCollectionType} from '../../rules/utils/index.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

const getResults = (code, {typeAware = false} = {}) => {
	const results = [];
	const messages = linter.verify(code, {
		files: ['**/*.ts'],
		languageOptions: typeAware
			? {
				parser: typescriptEslintParser,
				parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
			}
			: {
				parser: parsers.typescript.implementation,
				parserOptions: parsers.typescript.mergeParserOptions(),
			},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'CallExpression[callee.name="inspect"]'(node) {
								results.push(getBuiltinCollectionType(node.arguments[0], context));
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

test('ignores type operators that cannot wrap a collection type', t => {
	t.assert.deepStrictEqual(getResults('inspect(value as readonly string[]); inspect(value as keyof Foo);'), [undefined, undefined]);
	t.assert.deepStrictEqual(getResults('const set = new Set(); inspect(set as readonly string[]);'), ['Set']);
});

test('does not trust type information when a collection type name is redeclared', t => {
	t.assert.deepStrictEqual(getResults('declare const value: globalThis.Set<string>; inspect(value);', {typeAware: true}), ['Set']);
	t.assert.deepStrictEqual(getResults('type Set = number; declare const value: globalThis.Set<string>; inspect(value);', {typeAware: true}), [undefined]);
});

test('detects mixed map and set types', t => {
	t.assert.deepStrictEqual(getResults('declare const value: Map<string, string> | ReadonlyMap<string, string>; inspect(value);'), ['Map']);
	t.assert.deepStrictEqual(getResults('declare const value: Set<string> | ReadonlySet<string>; inspect(value);'), ['Set']);
	t.assert.deepStrictEqual(getResults('declare const value: Map<string, string> | Set<string>; inspect(value);'), [undefined]);
});
