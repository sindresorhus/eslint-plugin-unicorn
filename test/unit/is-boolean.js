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

test('recognizes documented booleans without confusing nullable or container types', t => {
	for (const [type, expected] of [
		['boolean', true],
		['Boolean', true],
		['true | false', true],
		['boolean | undefined', false],
		['?boolean', false],
		['boolean | string', false],
		['boolean[]', false],
		['Array<boolean>', false],
		['() => boolean', false],
		['Promise<boolean>', false],
		['unknown', false],
	]) {
		t.assert.deepStrictEqual(getResults(`/** @type {${type}} */ let value; inspect(value);`), [expected], type);
	}
});

test('trusts explicit JSDoc over initializers and keeps optional parameters uncertain', t => {
	for (const code of [
		'/** @type {string} */ const value = true; inspect(value);',
		'/** @type {unknown} */ const value = true; inspect(value);',
		'/** @param {boolean} [value] */ function run(value) { inspect(value); }',
		'/** @param {boolean=} value */ function run(value) { inspect(value); }',
		'/** @param {boolean} value */ function run(value: string) { inspect(value); }',
	]) {
		t.assert.deepStrictEqual(getResults(code), [false], code);
	}

	t.assert.deepStrictEqual(getResults('/** @param {boolean} value */ function run(value) { inspect(value); }'), [true]);
});

test('type information only refines unknown documented value types', t => {
	for (const type of ['string', 'number', 'Array<boolean>', '() => boolean']) {
		const code = `/** @type {${type}} */ const value = true; inspect(value);`;
		t.assert.deepStrictEqual(getResults(code, {typeAware: true}), [false], type);
	}

	t.assert.deepStrictEqual(getResults('/** @type {unknown} */ const value = true; inspect(value);', {typeAware: true}), [true]);
	t.assert.deepStrictEqual(getResults('/** @type {boolean} */ const value = "text"; inspect(value);', {typeAware: true}), [true]);
});

test('compiler inference through aliases respects definite documented types', t => {
	for (const expression of ['value', '(0, value)', 'source ? value : value']) {
		const code = `/** @type {string} */ const value = true; const alias = ${expression}; inspect(alias);`;
		t.assert.deepStrictEqual(getResults(code, {typeAware: true}), [false], expression);
	}

	t.assert.deepStrictEqual(getResults('/** @type {unknown} */ const value = true; const alias = value; inspect(alias);', {typeAware: true}), [true]);
});

test('mixed documented types retain consistent compiler refinement through aliases', t => {
	for (const type of ['boolean | string', 'boolean | (() => boolean)']) {
		const code = `/** @type {${type}} */ const value = true; const alias = value; inspect(value); inspect(alias);`;
		t.assert.deepStrictEqual(getResults(code), [false, false], type);
		t.assert.deepStrictEqual(getResults(code, {typeAware: true}), [true, true], type);
	}
});

test('type information cannot bypass definite documented call result types', t => {
	for (const code of [
		'/** @returns {string} */ function read() { return true; } inspect(read());',
		'/** @type {() => string} */ const read = () => true; inspect(read());',
		'/** @param {() => string} read */ function run(read = () => true) { inspect(read()); }',
		'/** @type {() => Array<boolean>} */ const read = () => true; inspect(read());',
	]) {
		t.assert.deepStrictEqual(getResults(code, {typeAware: true}), [false], code);
	}

	for (const code of [
		'/** @returns {unknown} */ function read() { return true; } inspect(read());',
		'/** @type {() => unknown} */ const read = () => true; inspect(read());',
		'/** @returns {string} */ function read(): boolean { return true; } inspect(read());',
		'type Flag = true | false; /** @returns {string} */ function read(): Flag { return true; } inspect(read());',
		'function read(value: unknown): value is boolean { return true; } inspect(read(source));',
		'function read(value: string): boolean; function read(value: number): boolean; function read(value: string | number): boolean | string { return true; } inspect(read(1));',
	]) {
		t.assert.deepStrictEqual(getResults(code, {typeAware: true}), [true], code);
	}
});

test('uses documented returns and callable annotations only for calls', t => {
	for (const code of [
		'/** @returns {boolean} */ function predicate() { return value; } inspect(predicate());',
		'/** @returns {boolean} */ const predicate = () => value; inspect(predicate());',
		'/** @type {() => boolean} */ const predicate = unknown; inspect(predicate());',
	]) {
		t.assert.deepStrictEqual(getResults(code), [true], code);
	}

	for (const code of [
		'/** @returns {boolean | undefined} */ function predicate() { return true; } inspect(predicate());',
		'/** @returns {unknown} */ function predicate() { return true; } inspect(predicate());',
		'/** @type {boolean} */ const predicate = unknown; inspect(predicate());',
		'/** @returns {boolean} */ async function predicate() { return true; } inspect(predicate());',
	]) {
		t.assert.deepStrictEqual(getResults(code), [false], code);
	}
});

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

for (const [type, expression, expected] of [
	['string', 'value.startsWith("a")', true],
	['String', 'value.isWellFormed()', true],
	['string', 'value.charAt(0)', false],
	['Array<boolean>', 'value.every(predicate)', true],
	['ReadonlyArray<string>', 'value.includes("a")', true],
	['Array<boolean>', 'value.find(predicate)', false],
	['Map<string, boolean>', 'value.has("key")', true],
	['ReadonlyMap<string, boolean>', 'value.has("key")', true],
	['Map<string, boolean>', 'value.get("key")', false],
	['WeakMap<object, boolean>', 'value.has(key)', true],
	['Set<boolean>', 'value.has(true)', true],
	['ReadonlySet<boolean>', 'value.isSubsetOf(other)', true],
	['Set<boolean>', 'value.add(true)', false],
	['WeakSet<object>', 'value.has(key)', true],
	['RegExp', 'value.test("text")', true],
	['RegExp', 'value.global', true],
	['RegExp', 'value.exec("text")', false],
	['Array<string> | ReadonlyArray<number>', 'value.some(predicate)', true],
	['?string', 'value.includes("a")', false],
	['Set<string> | undefined', 'value.has("a")', false],
	['Unresolved', 'value.has("a")', false],
	['Map<>', 'value.has("a")', false],
]) {
	test(`documented ${type} receiver: ${expression}`, t => {
		t.assert.deepStrictEqual(getResults(`/** @param {${type}} value */ function run(value) { inspect(${expression}); }`), [expected]);
	});
}

test('unknown documented receivers do not inherit certainty from their initializer', t => {
	for (const code of [
		'/** @type {unknown} */ const value = []; inspect(value.some(predicate));',
		'/** @type {Unresolved} */ const value = new Set(); inspect(value.has(key));',
		'/** @type {string |} */ const value = "text"; inspect(value.includes("t"));',
		'/** @type {Array<keyof Task>} */ const value = []; inspect(value.every(predicate));',
	]) {
		t.assert.deepStrictEqual(getResults(code), [false], code);
	}
});

test('callable documentation cannot turn async functions or generators into boolean calls', t => {
	for (const kind of ['const', 'let', 'var']) {
		for (const initializer of [
			'async () => true',
			'async function () { return true; }',
			'function* () { return true; }',
			'async function* () { return true; }',
			'(async () => true)!',
			'(function* () { return true; }) satisfies (() => boolean)',
		]) {
			t.assert.deepStrictEqual(getResults(`/** @type {() => boolean} */ ${kind} predicate = ${initializer}; inspect(predicate());`), [false], `${kind} ${initializer}`);
		}
	}
});

test('native function return types take precedence over callable JSDoc bindings', t => {
	for (const [initializer, type, expected] of [
		['(): string => "text"', '() => boolean', false],
		['function (): string { return "text"; }', '() => boolean', false],
		['(): boolean => true', '() => string', true],
		['function (): boolean { return true; }', '() => string', true],
	]) {
		const code = `/** @type {${type}} */ const predicate = ${initializer}; inspect(predicate());`;
		t.assert.deepStrictEqual(getResults(code), [expected], code);
	}
});

test('callable JSDoc cannot override native asserted initializer types', t => {
	for (const initializer of [
		'(() => "text") as (() => string)',
		'<() => string>(() => "text")',
		'(((): boolean => source) as unknown as (() => string))',
		'((() => "text") as (() => string))!',
	]) {
		const code = `/** @type {() => boolean} */ const predicate = ${initializer}; inspect(predicate());`;
		t.assert.deepStrictEqual(getResults(code), [false], initializer);
	}
});

test('documented callback defaults cannot disguise async or generator call results', t => {
	for (const initializer of [
		'async () => true',
		'async function () { return true; }',
		'function* () { return true; }',
		'async function* () { return true; }',
		'(async () => true)!',
		'(function* () { return true; }) satisfies (() => boolean)',
	]) {
		const code = `/** @param {() => boolean} predicate */ function run(predicate = ${initializer}) { inspect(predicate()); }`;
		t.assert.deepStrictEqual(getResults(code), [false], initializer);
	}

	const code = 'class Task { /** @param {() => boolean} predicate */ constructor(public predicate = async () => true) { inspect(predicate()); } }';
	t.assert.deepStrictEqual(getResults(code), [false]);
});

test('native return annotations on parameter defaults cannot establish the supplied callback contract', t => {
	for (const [type, initializer] of [
		['() => boolean', '(): string => "text"'],
		['() => string', '(): boolean => true'],
		['() => boolean', '(): boolean => true'],
	]) {
		const code = `/** @param {${type}} predicate */ function run(predicate = ${initializer}) { inspect(predicate()); }`;
		t.assert.deepStrictEqual(getResults(code), [false], code);
	}
});

test('unannotated synchronous callback defaults retain their documented return contract', t => {
	const code = '/** @param {() => boolean} predicate */ function run(predicate = () => true) { inspect(predicate()); }';
	t.assert.deepStrictEqual(getResults(code), [true]);
});
