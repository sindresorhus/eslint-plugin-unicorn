import test from 'node:test';
import {Linter} from 'eslint';
import {parseForESLint} from '@typescript-eslint/parser';
import {isConstEnumReference} from '../../rules/utils/index.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

const linter = new Linter();

/*
Return `isConstEnumReference()` for the object of every `….marker` member expression in `code`.
*/
const getResults = (code, parser = typescriptEslintParser) => {
	const results = [];
	const messages = linter.verify(code, {
		files: ['**/*.ts'],
		languageOptions: {
			parser,
			parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
		},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'MemberExpression[property.name="marker"]'(node) {
								results.push(isConstEnumReference(node.object, context));
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

test('detects const enums referenced through an import alias', t => {
	t.assert.deepStrictEqual(getResults('namespace Namespace { export const enum Direction { marker } } import Alias = Namespace.Direction; Alias.marker;'), [true]);
	t.assert.deepStrictEqual(getResults('namespace Namespace { export enum Direction { marker } } import Alias = Namespace.Direction; Alias.marker;'), [false]);
});

test('returns `false` when the reference has no symbol', t => {
	t.assert.deepStrictEqual(getResults('undeclared.marker;'), [false]);
});

test('returns `false` when type information fails', t => {
	const parser = {
		parseForESLint(code, options) {
			const result = parseForESLint(code, options);
			return {
				...result,
				services: {
					...result.services,
					program: {
						getTypeChecker() {
							throw new Error('Type information failed');
						},
					},
				},
			};
		},
	};

	t.assert.deepStrictEqual(getResults('foo.marker;', parser), [false]);
});
