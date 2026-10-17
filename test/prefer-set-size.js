import nodeTest from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {transpileModule, ScriptTarget} from 'typescript';
import outdent from 'outdent';
import plugin from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'new Set(foo).size',
		'for (const foo of bar) console.log([...foo].length)',
		'[...new Set(array), foo].length',
		'[foo, ...new Set(array), ].length',
		'[...new Set(array)].notLength',
		'[...new Set(array)]?.length',
		'[...new Set(array)][length]',
		'[...new Set(array)]["length"]',
		'[...new NotSet(array)].length',
		'[...Set(array)].length',
		'const foo = new NotSet([]);[...foo].length;',
		'let foo = new Set([]);[...foo].length;',
		'const {foo} = new Set([]);[...foo].length;',
		'const [foo] = new Set([]);[...foo].length;',
		'[...foo].length',
		'var foo = new Set(); var foo = new Set(); [...foo].length',
		'[,].length',
		// `Array.from` — valid cases
		'Array.from(foo).length',
		'Array.from(new NotSet(array)).length',
		'Array.from(Set(array)).length',
		'Array.from(new Set(array)).notLength',
		'Array.from(new Set(array))?.length',
		'Array.from(new Set(array))[length]',
		'Array.from(new Set(array))["length"]',
		'Array.from(new Set(array), mapFn).length',
		'Array?.from(new Set(array)).length',
		'Array.from?.(new Set(array)).length',
		'const foo = new NotSet([]);Array.from(foo).length;',
		'let foo = new Set([]);Array.from(foo).length;',
		'const {foo} = new Set([]);Array.from(foo).length;',
		'const [foo] = new Set([]);Array.from(foo).length;',
		'var foo = new Set(); var foo = new Set(); Array.from(foo).length',
		'NotArray.from(new Set(array)).length',
	],
	invalid: [
		'[...new Set(array)].length',
		outdent`
			const foo = new Set([]);
			console.log([...foo].length);
		`,
		outdent`
			function isUnique(array) {
				return[...new Set(array)].length === array.length
			}
		`,
		'[...new Set(array),].length',
		'[...(( new Set(array) ))].length',
		'(( [...new Set(array)] )).length',
		outdent`
			foo
			;[...new Set(array)].length
		`,
		'[/* comment */...new Set(array)].length',
		'[...new /* comment */ Set(array)].length',
		// `Array.from` — invalid cases
		'Array.from(new Set(array)).length',
		outdent`
			const foo = new Set([]);
			console.log(Array.from(foo).length);
		`,
		'Array.from((( new Set(array) ))).length',
		'(( Array.from(new Set(array)) )).length',
		'Array.from(/* comment */ new Set(array)).length',
		'Array.from(new /* comment */ Set(array)).length',
		outdent`
			function isUnique(array) {
				return Array.from(new Set(array)).length === array.length
			}
		`,
		{
			code: 'function getSize(set: Set<string>) { return Array.from(set).length; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function getSize(set: ReadonlySet<string>) { return Array.from(set).length; }',
			languageOptions: {parser: parsers.typescript},
		},
		// Type assertions need parentheses when becoming a member expression object
		{
			code: 'function getSize(set: unknown) { return [...(set as Set<string>)].length; }',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'function getSize(set: unknown) { return Array.from(set as Set<string>).length; }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// Writing to `[...set].length` writes to a throwaway array, not to the `Set`
test({
	valid: [
		'const set = new Set();\n[...set].length = 1;',
		'const set = new Set();\n[...set].length++;',
		'const set = new Set();\nfor ([...set].length of values) {}',
		'const set = new Set();\n[[...set].length] = values;',
		'const set = new Set();\n({value: Array.from(set).length} = object);',
		'const set = new Set();\ndelete [...set].length;',
	],
	invalid: [
		{
			code: 'const set = new Set();\nconsole.log([...set].length);',
			output: 'const set = new Set();\nconsole.log(set.size);',
			errors: 1,
		},
	],
});

// The replacement can introduce a leading parenthesis after an ASI boundary.
test({
	valid: [],
	invalid: [{
		code: 'const set = new Set();\nuse()\nArray.from(set as Set<number>).length;',
		languageOptions: {parser: parsers.typescript},
		output: 'const set = new Set();\nuse()\n;(set as Set<number>).size;',
		errors: 1,
	}],
});

test({
	valid: [],
	invalid: [
		['getSet()', '(getSet())'],
		['(getSet())', '(getSet())'],
		['getSet() as Set<number>', '(getSet() as Set<number>)'],
		['getSet() satisfies Set<number>', '(getSet() satisfies Set<number>)'],
		['getSet()!', '(getSet()!)'],
		['new Set([1])', 'new Set([1])'],
	].map(([receiver, replacement]) => ({
		code: `declare function getSet(): Set<number>; new [...${receiver}].length.constructor("42");`,
		languageOptions: {parser: parsers.typescript},
		output: `declare function getSet(): Set<number>; new ${replacement}.size.constructor("42");`,
		errors: 1,
	})),
});

nodeTest('set size fixes preserve constructor callees after TypeScript erasure', t => {
	const linter = new Linter();
	const config = {
		languageOptions: {parser: typescriptEslintParser},
		plugins: {unicorn: plugin},
		rules: {'unicorn/prefer-set-size': 'error'},
	};
	const execute = source => {
		const {outputText, diagnostics} = transpileModule(source, {compilerOptions: {target: ScriptTarget.ESNext}, reportDiagnostics: true});
		t.assert.deepStrictEqual(diagnostics, []);
		t.assert.deepStrictEqual(linter.verify(outputText, {}), []);
		return runInNewContext(outputText, {getSet: () => new Set([1])});
	};

	for (const receiver of ['getSet()', '(getSet())', 'getSet() as Set<number>', 'getSet() satisfies Set<number>', 'getSet()!', 'new Set([1])']) {
		const code = `declare function getSet(): Set<number>; new [...${receiver}].length.constructor("42").valueOf();`;
		const {output, messages, fixed} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(execute(code), 42);
		t.assert.strictEqual(execute(output), execute(code));
	}
});
