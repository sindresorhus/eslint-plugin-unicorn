import test from 'node:test';
import {Linter} from 'eslint';
import {parseForESLint} from '@typescript-eslint/parser';
import {isBooleanExpression, isBooleanFunction, isFunctionTypeAnnotation} from '../../rules/utils/is-boolean.js';
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

test('documented function returns can be classified without resolving scopes', t => {
	for (const [type, expected] of [['boolean', true], ['string', false], ['boolean | null', false], ['() => boolean', false], ['unknown', false]]) {
		let scopeQueries = 0;
		const results = getResults(`inspect(/** @returns {${type}} */ () => source);`, {
			inspect(node, context) {
				const sourceCode = new Proxy(context.sourceCode, {
					get(target, property) {
						const value = Reflect.get(target, property, target);
						if (property === 'getScope') {
							return (...arguments_) => {
								scopeQueries++;
								return value.apply(target, arguments_);
							};
						}

						return typeof value === 'function' ? value.bind(target) : value;
					},
				});
				return isBooleanFunction(node, {sourceCode});
			},
		});
		t.assert.deepStrictEqual(results, [expected], type);
		t.assert.strictEqual(scopeQueries, 0, type);
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

test('native return aliases resolve in their signature scope rather than the function body', t => {
	for (const code of [
		'type Result = string; /** @type {() => boolean} */ const read = (): Result => { type Result = boolean; return "text"; }; inspect(read());',
		'type Result = string; /** @returns {boolean} */ function read(): Result { type Result = boolean; return "text"; } inspect(read());',
		'type Result = string; const read = function named(): Result { type Result = boolean; return "text"; }; inspect(read());',
	]) {
		t.assert.deepStrictEqual(getResults(code), [false], code);
	}

	for (const code of [
		'type Result = boolean; /** @type {() => string} */ const read = (): Result => { type Result = string; return source; }; inspect(read());',
		'type Result = boolean; /** @returns {string} */ function read(): Result { type Result = string; return source; } inspect(read());',
		'type Result = boolean; const read = function named(): Result { type Result = string; return source; }; inspect(read());',
	]) {
		t.assert.deepStrictEqual(getResults(code), [true], code);
	}
});

test('generic return parameters do not resolve to same-named outer boolean aliases', t => {
	for (const code of [
		'type T = boolean; const read = <T>(value: T): T => value; inspect(read("text"));',
		'type T = boolean; /** @type {() => boolean} */ const read = <T>(value: T): T => value; inspect(read("text"));',
		'type T = boolean; function read<T>(value: T): T { return value; } inspect(read("text"));',
	]) {
		t.assert.deepStrictEqual(getResults(code), [false], code);
	}

	t.assert.deepStrictEqual(getResults('type T = string; const read = <T>(value: T): boolean => source; inspect(read("text"));'), [true]);
});

test('callable alias and interface signatures use their own reference scopes', t => {
	for (const [code, expected] of [
		['type Flag = boolean; type Read = () => Flag; let read: Read; inspect(read());', true],
		['type Flag = boolean; interface Read { (): Flag; } let read: Read; inspect(read());', true],
		['type Flag = boolean; type Read = <Flag>(value: Flag) => Flag; let read: Read; inspect(read("text"));', false],
		['type Flag = boolean; interface Read { <Flag>(value: Flag): Flag; } let read: Read; inspect(read("text"));', false],
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

test('documented typed arrays supply boolean iteration and membership results', t => {
	for (const type of ['Uint8Array', 'BigInt64Array', 'Array<number> | Uint8Array', 'Uint8Array | BigInt64Array']) {
		const code = `/** @param {${type}} values */ function run(values) { inspect(values.every(predicate)); inspect(values.includes(value)); inspect(values.some(predicate)); }`;
		t.assert.deepStrictEqual(getResults(code), [true, true, true], type);
	}
});

test('inline indexed collection constructors supply boolean method results', t => {
	for (const constructor of ['Array', 'Uint8Array', 'BigInt64Array']) {
		const code = `inspect(new ${constructor}(length).every(predicate)); inspect(new ${constructor}(length).includes(value)); inspect(new ${constructor}(length).some(predicate));`;
		t.assert.deepStrictEqual(getResults(code), [true, true, true], constructor);
	}
});

test('inline constructor inference keeps unknown receivers and method chains uncertain', t => {
	const code = 'class Values extends Array {} inspect(new Values().some(predicate)); inspect(new Unknown().every(predicate)); inspect(new BigInt64Array(length).subarray(1).some(predicate));';
	t.assert.deepStrictEqual(getResults(code), [false, false, false]);
});

test('interpolated template receivers supply boolean string methods', t => {
	// eslint-disable-next-line no-template-curly-in-string -- The inspected source contains template literals.
	const code = 'inspect(`${value}`.startsWith("x")); inspect(`prefix${value}`.includes("x")); inspect(`${value}suffix`.isWellFormed());';
	t.assert.deepStrictEqual(getResults(code), [true, true, true]);
});

test('conditional receivers retain common documented string and collection types', t => {
	const code = [
		'/** @param {string} left\n * @param {string} right\n * @param {Array<string>} values\n * @param {Uint8Array} bytes */',
		'function run(left, right, values, bytes) {',
		' inspect((flag ? left : right).startsWith("x"));',
		' inspect((flag ? values : bytes).some(predicate));',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [true, true]);
});

test('sequence receivers use their final documented value', t => {
	const code = '/** @param {string} text\n * @param {BigInt64Array} values */ function run(text, values) { inspect((effect(), text).includes("x")); inspect((effect(), values).every(predicate)); }';
	t.assert.deepStrictEqual(getResults(code), [true, true]);
});

test('conditional and sequence receiver inference retains uncertainty and method boundaries', t => {
	const code = [
		'/** @param {string} text\n * @param {Array<string>} values\n * @param {unknown} other */',
		'function run(text, values, other) {',
		' inspect((flag ? text : other).startsWith("x"));',
		' inspect((flag ? values : other).some(predicate));',
		' inspect((text, other).includes("x"));',
		' inspect((flag ? text : text).charAt(0));',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false, false, false]);
});

test('template receiver inference keeps tagged values and nonboolean methods uncertain', t => {
	// eslint-disable-next-line no-template-curly-in-string -- The inspected source contains template literals.
	const code = 'inspect(tag`${value}`.startsWith("x")); inspect(`${value}`.charAt(0));';
	t.assert.deepStrictEqual(getResults(code), [false, false]);
});

test('documented callable objects supply typed array union receiver methods', t => {
	const code = '/** @param {{(): Uint8Array | BigInt64Array}} read */ function run(read) { inspect(read().some(predicate)); }';
	t.assert.deepStrictEqual(getResults(code), [true]);
});

test('native mixed receiver types retain uncertainty over conflicting documentation', t => {
	const code = '/** @param {Array<string>} values */ function run(values: Uint8Array | {some(predicate): string}) { inspect(values.some(predicate)); }';
	for (const typeAware of [false, true]) {
		t.assert.deepStrictEqual(getResults(code, {typeAware}), [false]);
	}
});

test('native receiver assertions override conflicting documented method types', t => {
	const code = [
		'/** @param {string} text\n * @param {Array<string>} values */',
		'function run(text, values) {',
		' inspect((text as {includes(): string}).includes());',
		' inspect((<{some(): string}>values).some());',
		'}',
	].join('\n');
	for (const typeAware of [false, true]) {
		t.assert.deepStrictEqual(getResults(code, {typeAware}), [false, false]);
	}
});

test('native receiver assertions provide their own string and collection types', t => {
	const code = 'inspect((source as string).includes("x")); inspect((source as Uint8Array).some(predicate)); inspect((<string>source).startsWith("x"));';
	for (const typeAware of [false, true]) {
		t.assert.deepStrictEqual(getResults(code, {typeAware}), [true, true, true]);
	}
});

test('native receiver assertions supply certainty over unknown documentation', t => {
	const code = '/** @param {unknown} value */ function run(value) { inspect((value as string).includes("x")); inspect((value as string[]).some(predicate)); }';
	t.assert.deepStrictEqual(getResults(code), [true, true]);
});

test('receiver assertion inference retains syntax-only nullish and union uncertainty', t => {
	const code = 'inspect((source as string | null).includes("x")); inspect((source as Uint8Array | {some(): string}).some());';
	t.assert.deepStrictEqual(getResults(code), [false, false]);
});

test('mixed receiver assertions cannot recover certainty from their documented binding', t => {
	const code = [
		'/** @param {string} text\n * @param {Uint8Array} values */',
		'function run(text, values) {',
		' inspect((text as string | {includes(): string}).includes());',
		' inspect((<Uint8Array | {some(): string}>values).some());',
		'}',
	].join('\n');
	for (const typeAware of [false, true]) {
		t.assert.deepStrictEqual(getResults(code, {typeAware}), [false, false]);
	}
});

test('asserted receiver types also govern boolean property reads', t => {
	const code = '/** @param {RegExp} pattern */ function run(pattern) { inspect((pattern as {global: string}).global); inspect((source as RegExp).global); }';
	for (const typeAware of [false, true]) {
		t.assert.deepStrictEqual(getResults(code, {typeAware}), [false, true]);
	}
});

test('native typed array receivers supply boolean results with and without type information', t => {
	for (const typeAware of [false, true]) {
		for (const type of ['Uint8Array', 'BigInt64Array', 'Array<number> | Uint8Array']) {
			const code = `function run(values: ${type}) { inspect(values.every(predicate)); inspect(values.includes(value)); inspect(values.some(predicate)); }`;
			t.assert.deepStrictEqual(getResults(code, {typeAware}), [true, true, true], code);
		}
	}
});

test('uncertain typed array receivers do not prove boolean method results', t => {
	for (const type of ['?Uint8Array', 'BigInt64Array | undefined', 'Uint8Array | string', 'Uint8Array | Unresolved']) {
		const code = `/** @param {${type}} values */ function run(values) { inspect(values.some(predicate)); inspect(values.includes(value)); }`;
		t.assert.deepStrictEqual(getResults(code), [false, false], type);
	}

	for (const type of ['Uint8Array | null', 'BigInt64Array | undefined']) {
		const code = `function run(values: ${type}) { inspect(values.some(predicate)); }`;
		t.assert.deepStrictEqual(getResults(code), [false], type);
	}

	const code = 'function run(values: Uint8Array | {some(predicate): string}) { inspect(values.some(predicate)); }';
	t.assert.deepStrictEqual(getResults(code), [false]);
	t.assert.deepStrictEqual(getResults(code, {typeAware: true}), [false]);
});

test('typed array receiver classification does not extend to unsupported BigInt method chains', t => {
	const code = '/** @param {BigInt64Array} values */ function run(values) { inspect(values.subarray(1).every(predicate)); }';
	t.assert.deepStrictEqual(getResults(code), [false]);
});

test('typed array constructor bindings and static factories supply boolean receiver methods', t => {
	const code = 'const values = new BigInt64Array(1); inspect(values.some(predicate)); inspect(BigInt64Array.from(source).every(predicate));';
	t.assert.deepStrictEqual(getResults(code), [true, true]);
});

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
