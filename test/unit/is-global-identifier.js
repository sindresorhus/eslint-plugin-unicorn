import test from 'node:test';
import {Linter} from 'eslint';
import {isGlobalNameAvailable, isTypeOnlyDefinition} from '../../rules/utils/index.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

/*
Run `getResult` on each `inspect(…)` call.
*/
const getResults = (code, getResult) => {
	const results = [];
	const linter = new Linter();
	const messages = linter.verify(code, {
		files: ['**/*.ts'],
		languageOptions: {
			parser: typescriptEslintParser,
			sourceType: 'module',
		},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'CallExpression[callee.name="inspect"]'(node) {
								results.push(getResult(node, context));
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

test('`isGlobalNameAvailable` returns `true` when the name is not shadowed by a runtime binding', t => {
	for (const code of [
		'inspect();',
		'Array.from(foo); inspect();',
		'type Array = string[]; inspect();',
		'interface Array {} inspect();',
		'import type {Array} from "foo"; inspect();',
		'import {type Array} from "foo"; inspect();',
		'function foo(Map) {} inspect();',
	]) {
		t.assert.deepStrictEqual(getResults(code, (node, context) => isGlobalNameAvailable('Array', node, context)), [true], code);
	}
});

test('`isGlobalNameAvailable` returns `false` when the name is shadowed by a runtime binding', t => {
	for (const code of [
		'const Array = foo; inspect();',
		'function foo(Array) { inspect(); }',
		'import {Array} from "foo"; inspect();',
		'import Array from "foo"; inspect();',
		'class Array {} inspect();',
		'enum Array {} inspect();',
		'type Array = string[]; const Array = foo; inspect();',
		'{ let Array; { inspect(); } }',
	]) {
		t.assert.deepStrictEqual(getResults(code, (node, context) => isGlobalNameAvailable('Array', node, context)), [false], code);
	}
});

test('`isTypeOnlyDefinition` matches type declarations and type-only imports', t => {
	const getDefinitionResults = code => getResults(code, (node, context) => {
		const variable = context.sourceCode.getScope(node).set.get('Foo');
		return variable.defs.map(definition => isTypeOnlyDefinition(definition));
	});

	for (const [code, expected] of [
		['type Foo = string; inspect();', [true]],
		['interface Foo {} inspect();', [true]],
		['import type {Foo} from "foo"; inspect();', [true]],
		['import type Foo from "foo"; inspect();', [true]],
		['import {type Foo} from "foo"; inspect();', [true]],
		['import {Foo} from "foo"; inspect();', [false]],
		['import * as Foo from "foo"; inspect();', [false]],
		['const Foo = 1; inspect();', [false]],
		['class Foo {} inspect();', [false]],
		['enum Foo {} inspect();', [false]],
		['interface Foo {} const Foo = 1; inspect();', [true, false]],
	]) {
		t.assert.deepStrictEqual(getDefinitionResults(code), [expected], code);
	}
});
