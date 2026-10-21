import test from 'node:test';
import {Linter} from 'eslint';
import isBoolean from '../../rules/utils/is-boolean.js';
import isString, {isKnownNonString} from '../../rules/utils/is-string.js';
import isNumber, {isKnownNonNumber} from '../../rules/utils/is-number.js';
import isBigInt, {isKnownNonBigInt} from '../../rules/utils/is-bigint.js';
import isArray, {isIndexedCollection, isKnownNonArray, isKnownBigIntTypedArray} from '../../rules/utils/is-array.js';
import {isSet} from '../../rules/utils/is-set.js';
import {createTypeCheckers, hasJSDocumentTypeReference} from '../../rules/utils/type-helpers.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();
const predicates = {
	boolean: isBoolean, string: isString, number: isNumber, bigint: isBigInt, array: isArray, indexed: isIndexedCollection, set: isSet, bigintArray: isKnownBigIntTypedArray,
};

test('legacy void and nullish aliases are definite non-string values', t => {
	const checks = {string: isString, nonString: isKnownNonString};
	for (const type of ['Void', 'Null', 'Undefined']) {
		const code = `/** @type {${type}} */ let value; inspect(value);`;
		t.assert.deepStrictEqual(getInferences(code, {checks}), [['nonString']], type);
		t.assert.deepStrictEqual(getInferences(code, {checks, typescript: true}), [['nonString']], type);
	}
});

test('malformed callback receiver types cannot establish binding or call result types', t => {
	for (const typescript of [false, true]) {
		for (const type of ['function(this): boolean', 'function(this, string): string', 'function(function(this)): boolean', 'Array<function(this): boolean>']) {
			const code = `/** @type {${type}} */ const read = source; inspect(read); inspect(read());`;
			t.assert.deepStrictEqual(getInferences(code, {typescript}), [[], []], type);
		}
	}
});

test('derived string receivers reuse shared inference for boolean methods', t => {
	const code = [
		'/** @param {string} prefix */ function run(prefix, suffix, value) {',
		' inspect((prefix + suffix).startsWith("x"));',
		' inspect((typeof value).includes("object"));',
		' inspect((value = prefix).endsWith("x"));',
		' inspect((prefix + suffix).charAt(0));',
		'}',
	].join('\n');
	for (const typescript of [false, true]) {
		t.assert.deepStrictEqual(getInferences(code, {typescript}), [['boolean'], ['boolean'], ['boolean'], []]);
	}
});

test('homogeneous logical receivers retain documented string and array types', t => {
	const code = [
		'/** @param {string} left\n * @param {string} right\n * @param {Array<string>} values */',
		'function run(left, right, values) {',
		' inspect((left || "").startsWith("x"));',
		' inspect((left && right).includes("x"));',
		' inspect((values ?? []).some(predicate));',
		'}',
	].join('\n');
	for (const typescript of [false, true]) {
		t.assert.deepStrictEqual(getInferences(code, {typescript}), [['boolean'], ['boolean'], ['boolean']]);
	}
});

test('assignment receivers retain documented collection and RegExp types', t => {
	const code = [
		'/** @param {Array<string>} values\n * @param {Uint8Array} bytes\n * @param {Set<string>} keys\n * @param {Map<string, number>} map\n * @param {RegExp} pattern */',
		'function run(values, bytes, keys, map, pattern, cache) {',
		' inspect(cache = values);',
		' inspect((cache = values).includes("x"));',
		' inspect((cache = bytes).some(predicate));',
		' inspect((cache = keys).has("x"));',
		' inspect((cache = map).has("x"));',
		' inspect((cache = pattern).global);',
		'}',
	].join('\n');
	for (const typescript of [false, true]) {
		t.assert.deepStrictEqual(getInferences(code, {typescript}), [['array', 'indexed'], ['boolean'], ['boolean'], ['boolean'], ['boolean'], ['boolean']]);
	}
});

test('constant aliases preserve the assigned results of documented callbacks', t => {
	const code = '/** @returns {Set<string>} */ function read() { return source; } function run(cache) { const alias = (cache = read()); inspect(alias); }';
	for (const typescript of [false, true]) {
		t.assert.deepStrictEqual(getInferences(code, {typescript}), [['set']]);
	}
});

test('generic Object dictionaries provide non-primitive facts without resolving bare Object', t => {
	const checks = {
		nonString: isKnownNonString,
		nonNumber: isKnownNonNumber,
		nonBigint: isKnownNonBigInt,
		nonArray: isKnownNonArray,
	};
	for (const typescript of [false, true]) {
		for (const type of ['Object<string, boolean>', 'Object.<number, () => boolean>']) {
			t.assert.deepStrictEqual(getInferences(`/** @type {${type}} */ let value; inspect(value);`, {checks, typescript}), [['nonString', 'nonNumber', 'nonBigint', 'nonArray']], type);
		}

		t.assert.deepStrictEqual(getInferences('/** @type {Object} */ let value; inspect(value);', {checks, typescript}), [[]]);
	}
});

test('arithmetic and uncertain concatenation cannot establish boolean receiver methods', t => {
	const code = [
		'/** @param {unknown} prefix */ function run(prefix, suffix) {',
		' inspect((prefix + suffix).startsWith("x"));',
		' inspect((prefix - suffix).includes("x"));',
		' inspect((+prefix).includes("x"));',
		' inspect((prefix = suffix).startsWith("x"));',
		'}',
	].join('\n');
	for (const typescript of [false, true]) {
		t.assert.deepStrictEqual(getInferences(code, {typescript}), [[], [], [], []]);
	}
});

test('mutable property receivers do not borrow static string method types', t => {
	const code = 'const object = {text: "x"}; object.text = {includes() { return "text"; }}; inspect(object.text.includes("x"));';
	for (const typescript of [false, true]) {
		t.assert.deepStrictEqual(getInferences(code, {typescript}), [[]]);
	}
});

/**
Exercise the production inference entry points on every inspected expression.
*/
function getInferences(code, {typescript = false, checks = predicates} = {}) {
	const results = [];
	const messages = linter.verify(code, {
		languageOptions: typescript
			? {
				parser: parsers.typescript.implementation,
				parserOptions: parsers.typescript.mergeParserOptions(),
			}
			: {},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'CallExpression[callee.name="inspect"]'(node) {
								results.push(Object.entries(checks).filter(([, predicate]) => predicate(node.arguments[0], context)).map(([name]) => name));
							},
						}),
					},
				},
			},
		},
		rules: {'test/inspect': 'error'},
	});
	if (messages.length > 0) {
		throw new Error(messages.map(message => message.message).join('\n'));
	}

	return results;
}

for (const [name, type, expected] of [
	['primitive boolean', 'boolean', ['boolean']],
	['boxed JSDoc boolean alias', 'Boolean', ['boolean']],
	['true literal', 'true', ['boolean']],
	['homogeneous boolean union', 'false | boolean | true', ['boolean']],
	['multiline leading union', '\n * | true\n * | false\n ', ['boolean']],
	['primitive string', 'string', ['string']],
	['boxed JSDoc string alias', 'String', ['string']],
	['quoted string union', '"left" | \'right\'', ['string']],
	['primitive number', 'number', ['number']],
	['boxed JSDoc number alias', 'Number', ['number']],
	['negative number literal', '-12.5', ['number']],
	['homogeneous number union', '1 | 2 | number', ['number']],
	['primitive bigint', 'bigint', ['bigint']],
	['negative bigint literal', '-12n', ['bigint']],
	['homogeneous bigint union', '0n | bigint', ['bigint']],
	['nested generic array', 'Array<Map<string, Set<boolean>>>', ['array', 'indexed']],
	['record array with untyped field', 'Array<{a: number, b}>', ['array', 'indexed']],
	['record array with readonly-named method', 'Array<{readonly(): boolean}>', ['array', 'indexed']],
	['multiline record array without member punctuation', 'Array<{\n * first: boolean\n * second: string\n * }>', ['array', 'indexed']],
	['Closure generic outer array', 'Array.<Promise<boolean>>', ['array', 'indexed']],
	['generic readonly array', 'ReadonlyArray<() => boolean>', ['array', 'indexed']],
	['array of nullable booleans', '(boolean | null)[]', ['array', 'indexed']],
	['array of optional functions', '(() => boolean)[]', ['array', 'indexed']],
	['tuple with optional element', '[boolean, string?]', ['array', 'indexed']],
	['named tuple', '[value: boolean, label?: string]', ['array', 'indexed']],
	['generic trailing comma', 'Array<boolean,>', ['array', 'indexed']],
	['readonly tuple', 'readonly [boolean, ...string[]]', ['array', 'indexed']],
	['set generic outer type', 'Set<Array<boolean>>', ['set']],
	['readonly set', 'ReadonlySet<string>', ['set']],
	['numeric typed array', 'Uint16Array', ['indexed']],
	['bigint typed array', 'BigUint64Array', ['indexed', 'bigintArray']],
	['mixed bigint typed array guard', 'BigInt64Array | Uint8Array', ['indexed', 'bigintArray']],
	['mixed primitive union', 'boolean | string', []],
	['nullable shorthand', '?boolean', []],
	['explicit nullish union', 'boolean | undefined', []],
	['optional outer array', 'Array<boolean>=', []],
	['boolean element is not the array type', 'boolean[]', ['array', 'indexed']],
	['boolean generic argument is not the outer type', 'Promise<boolean>', []],
	['callable return is not the binding type', '() => boolean', []],
	['Closure callable return is not the binding type', 'function(string): boolean', []],
	['record field is not the binding type', '{ready: boolean}', []],
	['unresolved name', 'Ready', []],
	['explicit any', 'any', []],
	['explicit unknown', 'unknown', []],
	['never', 'never', []],
	['null', 'null', []],
	['undefined', 'undefined', []],
]) {
	test(`shared inference classifies ${name}`, t => {
		t.assert.deepStrictEqual(getInferences(`/** @param {${type}} value */ function run(value) { inspect(value); }`), [expected]);
	});
}

for (const [name, type] of [
	['trailing union separator', 'boolean |'],
	['repeated intersection separator', '&& boolean'],
	['unbalanced parenthesis', '(boolean'],
	['extra token', 'boolean string'],
	['empty generic', 'Array<>'],
	['malformed generic argument', 'Array<boolean |>'],
	['malformed tuple member', '[boolean |]'],
	['malformed callable return', '() => boolean |'],
	['conditional type', 'T extends boolean ? boolean : string'],
	['indexed access type', 'Options["ready"]'],
	['key query', 'keyof Options'],
	['type query', 'typeof value'],
	['import type', 'import("package").Boolean'],
	// eslint-disable-next-line no-template-curly-in-string -- The annotation contains a template literal type.
	['template literal type', '`ready-${string}`'],
	['generic callable', '<T>() => boolean'],
]) {
	test(`present unknown ${name} suppresses boolean initializer inference`, t => {
		t.assert.deepStrictEqual(getInferences(`/** @type {${type}} */ const value = true; inspect(value);`), [[]]);
	});
}

for (const [name, code] of [
	['string', '/** @type {string |} */ const value = "ready"; inspect(value);'],
	['number', '/** @type {number |} */ const value = 1; inspect(value);'],
	['bigint', '/** @type {bigint |} */ const value = 1n; inspect(value);'],
	['array', '/** @type {Array<>} */ const value = []; inspect(value);'],
	['set', '/** @type {Set<>} */ const value = new Set(); inspect(value);'],
	['explicit unresolved type', '/** @type {Unresolved} */ const value = true; inspect(value);'],
	['explicit mixed union', '/** @type {boolean | string} */ const value = true; inspect(value);'],
]) {
	test(`annotation uncertainty masks ${name} initializer certainty`, t => {
		t.assert.deepStrictEqual(getInferences(code), [[]]);
	});
}

test('missing type braces preserve existing initializer inference', t => {
	t.assert.deepStrictEqual(getInferences('/** @type boolean */ const value = true; inspect(value);'), [['boolean']]);
	t.assert.deepStrictEqual(getInferences('/** @type {boolean */ const value = "ready"; inspect(value);'), [['string']]);
});

test('different source files cannot reuse cached classification for the same identifier', t => {
	for (const [type, expected] of [['boolean', ['boolean']], ['string', ['string']], ['number', ['number']], ['boolean', ['boolean']]]) {
		t.assert.deepStrictEqual(getInferences(`/** @type {${type}} */ let value; inspect(value);`), [expected]);
	}
});

test('same-named bindings stay scoped across parameters and blocks', t => {
	const code = '/** @type {string} */ let value; inspect(value); { /** @type {number} */ let value; inspect(value); } /** @param {boolean} value */ function run(value) { inspect(value); } inspect(value);';
	t.assert.deepStrictEqual(getInferences(code), [['string'], ['number'], ['boolean'], ['string']]);
});

test('exact parameter matching supports reordered aliases without affecting other parameters', t => {
	const code = '/**\n * @argument {Array<boolean>} second\n * @arg {string} first\n */ function run(first, second, third) { inspect(first); inspect(second); inspect(third); }';
	t.assert.deepStrictEqual(getInferences(code), [['string'], ['array', 'indexed'], []]);
});

test('optional parameter metadata is strict even when the JavaScript parameter has a default', t => {
	t.assert.deepStrictEqual(getInferences('/** @param {boolean} [value=false] */ function run(value = true) { inspect(value); }'), [[]]);
	t.assert.deepStrictEqual(getInferences('/** @param {boolean} value */ function run(value = true) { inspect(value); }'), [['boolean']]);
	t.assert.deepStrictEqual(getInferences('/** @param {string=} value */ function run(value = "ready") { inspect(value); }'), [[]]);
});

test('documented return types classify call results without classifying the function itself', t => {
	const code = '/** @returns {boolean} */ function ready() { return source; } /** @returns {string} */ const label = () => source; /** @returns {bigint} */ function count() { return source; } /** @returns {Set<boolean>} */ const values = () => source; inspect(ready); inspect(ready()); inspect(label); inspect(label()); inspect(count()); inspect(values());';
	t.assert.deepStrictEqual(getInferences(code), [[], ['boolean'], [], ['string'], ['bigint'], ['set']]);
});

test('documented numeric returns are recognized across function declaration forms', t => {
	const code = '/** @returns {number} */ function count() { return source; } /** @return {Number} */ const size = () => source; /** @returns {1 | 2} */ const rank = function () { return source; }; inspect(count); inspect(count()); inspect(size()); inspect(rank());';
	t.assert.deepStrictEqual(getInferences(code), [[], ['number'], ['number'], ['number']]);
});

test('documented numeric returns retain strict nullish, optional, async, and write policies', t => {
	for (const type of ['number | null', '?number', 'number=', 'unknown']) {
		t.assert.deepStrictEqual(getInferences(`/** @returns {${type}} */ function count() { return source; } inspect(count());`), [[]], type);
	}

	t.assert.deepStrictEqual(getInferences('/** @returns {number} */ async function count() { return source; } /** @returns {number} */ function* rank() { yield source; } inspect(count()); inspect(rank());'), [[], []]);
	t.assert.deepStrictEqual(getInferences('/** @returns {number} */ let count = () => source; count = source; inspect(count());'), [[]]);
});

test('native numeric return annotations take precedence over documented returns', t => {
	const code = '/** @returns {number} */ function label(): string { return source; } /** @returns {string} */ function count(): number { return source; } inspect(label()); inspect(count());';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['string'], ['number']]);
});

test('function type annotations classify boolean calls without mistaking the function for a boolean', t => {
	const code = '/** @type {() => boolean} */ let ready; inspect(ready); inspect(ready()); /** @type {function(string): boolean} */ let test; inspect(test); inspect(test("input"));';
	t.assert.deepStrictEqual(getInferences(code), [[], ['boolean'], [], ['boolean']]);
});

test('Closure callable records with untyped fields still describe a boolean return', t => {
	t.assert.deepStrictEqual(getInferences('/** @param {function({value}): boolean} test */ function run(test) { inspect(test); inspect(test({value: source})); }'), [[], ['boolean']]);
});

test('nullable or unknown documented returns cannot use a boolean function body as proof', t => {
	for (const type of ['?boolean', 'boolean | null', 'boolean=', 'boolean |', 'Unresolved']) {
		t.assert.deepStrictEqual(getInferences(`/** @returns {${type}} */ function ready() { return true; } inspect(ready());`), [[]], type);
	}
});

test('async and generator return annotations do not classify their immediate results as boolean', t => {
	t.assert.deepStrictEqual(getInferences('/** @returns {boolean} */ async function ready() { return true; } inspect(ready());'), [[]]);
	t.assert.deepStrictEqual(getInferences('/** @returns {boolean} */ function* ready() { return true; } inspect(ready());'), [[]]);
});

test('syntax-only TypeScript can consume JSDoc without requiring the compiler', t => {
	const code = '/** @param {Boolean} flag */ function run(flag) { inspect(flag); } /** @type {Array<string>} */ let values; inspect(values);';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['boolean'], ['array', 'indexed']]);
});

test('native TypeScript binding annotations override conflicting and malformed JSDoc', t => {
	const code = '/** @type {boolean} */ let value: string; inspect(value); /** @param {Array<>} values */ function run(values: boolean[]) { inspect(values); } /** @param {boolean} flag */ function other(flag: Boolean) { inspect(flag); }';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['string'], ['array', 'indexed'], []]);
});

test('native TypeScript return annotations override conflicting JSDoc', t => {
	const code = '/** @returns {string} */ function ready(): boolean { return source; } /** @returns {boolean} */ function label(): string { return source; } inspect(ready()); inspect(label());';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['boolean'], ['string']]);
});

test('JSDoc aliases do not change native TypeScript wrapper semantics', t => {
	const code = '/** @param {String} documented */ function run(documented, native: String, numeric: Number, boolean: Boolean) { inspect(documented); inspect(native); inspect(numeric); inspect(boolean); }';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['string'], [], [], []]);
});

test('known non-target predicates distinguish primitives without guessing names or container semantics', t => {
	const checks = {
		nonString: isKnownNonString, nonNumber: isKnownNonNumber, nonBigint: isKnownNonBigInt, nonArray: isKnownNonArray,
	};
	const code = '/** @param {string} text\n * @param {number} count\n * @param {bigint} big\n * @param {boolean[]} flags\n * @param {Unresolved} unknown\n * @param {boolean |} invalid\n */ function run(text, count, big, flags, unknown, invalid) { inspect(text); inspect(count); inspect(big); inspect(flags); inspect(unknown); inspect(invalid); }';
	t.assert.deepStrictEqual(getInferences(code, {checks}), [['nonNumber', 'nonBigint', 'nonArray'], ['nonString', 'nonBigint', 'nonArray'], ['nonString', 'nonNumber', 'nonArray'], [], [], []]);
});

test('shared named checkers recognize the outer type and preserve consumer union policies', t => {
	const common = {targetTypeNames: new Set(['Widget']), nonTargetTypeNames: new Set(['Other'])};
	const definite = createTypeCheckers(common).isTarget;
	const mixed = createTypeCheckers({...common, treatMixedUnionAsTarget: true}).isTarget;
	const nullish = createTypeCheckers({...common, allowNullishInMixedUnion: true}).isTarget;
	const checks = {definite, mixed, nullish};
	const code = '/** @param {Widget<string>} outer\n * @param {Other<Widget>} inner\n * @param {Widget | Other} mixed\n * @param {Widget | null} nullable\n * @param {Widget<keyof Options>} unsupported\n */ function run(outer, inner, mixed, nullable, unsupported) { inspect(outer); inspect(inner); inspect(mixed); inspect(nullable); inspect(unsupported); }';
	t.assert.deepStrictEqual(getInferences(code, {checks}), [['definite', 'mixed', 'nullish'], [], ['mixed'], ['mixed', 'nullish'], []]);
});

test('explicit annotations keep their existing trust across subsequent writes', t => {
	const code = '/** @type {boolean} */ let flag = source; flag = "other"; inspect(flag); /** @type {string} */ let text = source; text = 42; inspect(text);';
	t.assert.deepStrictEqual(getInferences(code), [['boolean'], ['string']]);
});

test('unsupported typedef resolution stays unknown even when the initializer is boolean', t => {
	const code = '/** @typedef {boolean} Flag */\n/** @type {Flag} */ const value = true; inspect(value);';
	t.assert.deepStrictEqual(getInferences(code), [[]]);
});

test('unattached declaration documentation does not override the next declaration', t => {
	const code = '/** @type {boolean} */ const previous = source; const value = "ready"; inspect(value);';
	t.assert.deepStrictEqual(getInferences(code), [['string']]);
});

test('destructuring annotations are ignored rather than applied to each extracted binding', t => {
	const code = '/** @param {boolean} options */ function run({value}) { inspect(value); } /** @type {boolean} */ const [element] = source; inspect(element);';
	t.assert.deepStrictEqual(getInferences(code), [[], []]);
});

test('unions of arrays retain only collection certainty', t => {
	const code = '/** @param {Array<boolean> | ReadonlyArray<string>} values */ function run(values) { inspect(values); }';
	t.assert.deepStrictEqual(getInferences(code), [['array', 'indexed']]);
});

test('postfix nullable array annotation remains uncertain for receiver checks', t => {
	const code = '/** @param {boolean[]?} values */ function run(values) { inspect(values); }';
	t.assert.deepStrictEqual(getInferences(code), [[]]);
});

for (const [description, type, expected] of [
	['arrow string return', '() => string', ['string']],
	['Closure string return', 'function(number): String', ['string']],
	['arrow array return', '() => Array<string>', ['array', 'indexed']],
	['arrow readonly array return', '() => readonly string[]', ['array', 'indexed']],
	['Closure set return', 'function(): Set<boolean>', ['set']],
	['arrow bigint return', '() => bigint', ['bigint']],
	['arrow bigint typed array return', '() => BigInt64Array', ['indexed', 'bigintArray']],
	['nullable return', '() => string | undefined', []],
	['nullable callable', '?(() => string)', []],
	['optional callable', '(() => string)=', []],
	['unresolved return', '() => Unresolved', []],
	['higher-order return', '() => () => string', []],
]) {
	test(`shared call inference uses ${description} on a binding`, t => {
		const code = `/** @type {${type}} */ let read; inspect(read());`;
		t.assert.deepStrictEqual(getInferences(code), [expected]);
	});

	test(`shared call inference uses ${description} on a parameter`, t => {
		const code = `/** @param {${type}} read */ function run(read) { inspect(read()); }`;
		t.assert.deepStrictEqual(getInferences(code), [expected]);
	});
}

test('callable return annotations keep variable and result types separate', t => {
	const code = '/** @type {() => Array<string>} */ const read = () => source; inspect(read); inspect(read());';
	t.assert.deepStrictEqual(getInferences(code), [[], ['array', 'indexed']]);
});

test('optional documented callback parameters do not guarantee a callable result', t => {
	const code = '/** @param {() => string} [read] */ function run(read) { inspect(read()); }';
	t.assert.deepStrictEqual(getInferences(code), [[]]);
});

test('native callback binding types take precedence over conflicting JSDoc', t => {
	const code = '/** @type {() => Array<string>} */ const read: () => string = () => source; inspect(read());';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]]);
});

test('subsequent writes prevent callable return inference', t => {
	const code = '/** @type {() => string} */ let read; read = other; inspect(read()); /** @param {() => Array<string>} callback */ function run(callback) { callback = other; inspect(callback()); }';
	t.assert.deepStrictEqual(getInferences(code), [[], []]);
});

test('subsequent writes prevent documented boolean callback result inference too', t => {
	const code = '/** @type {() => boolean} */ let read; read = other; inspect(read()); /** @param {() => boolean} callback */ function run(callback) { callback = other; inspect(callback()); }';
	t.assert.deepStrictEqual(getInferences(code), [[], []]);
});

for (const [description, declaration] of [
	['async declaration', 'async function read() { return source; }'],
	['generator declaration', 'function* read() { return source; }'],
	['async generator declaration', 'async function* read() { return source; }'],
	['async arrow', 'const read = async () => source;'],
	['generator expression', 'const read = function* () { return source; };'],
	['async function expression', 'const read = async function () { return source; };'],
]) {
	test(`${description} does not expose its documented yielded or resolved value as the call result`, t => {
		for (const type of ['Array<string>', 'Set<number>', 'string', 'bigint', 'BigInt64Array']) {
			const code = `/** @returns {${type}} */ ${declaration} inspect(read());`;
			t.assert.deepStrictEqual(getInferences(code), [[]], type);
		}
	});
}

test('synchronous return annotations still classify array, set, string, and bigint results', t => {
	const code = '/** @returns {string[]} */ function read() { return source; } /** @returns {Set<number>} */ const make = () => source; /** @returns {string} */ function label() { return source; } /** @returns {bigint} */ const count = function () { return source; }; inspect(read()); inspect(make()); inspect(label()); inspect(count());';
	t.assert.deepStrictEqual(getInferences(code), [['array', 'indexed'], ['set'], ['string'], ['bigint']]);
});

test('documented return values retain known boolean receiver methods and properties', t => {
	const code = '/** @returns {string} */ function text() { return source; } /** @returns {string[]} */ function values() { return source; } /** @returns {Set<string>} */ function keys() { return source; } /** @returns {RegExp} */ function pattern() { return source; } inspect(text().includes("x")); inspect(values().some(predicate)); inspect(keys().has(key)); inspect(pattern().test("x")); inspect(pattern().global);';
	t.assert.deepStrictEqual(getInferences(code), [['boolean'], ['boolean'], ['boolean'], ['boolean'], ['boolean']]);
});

test('documented callback results retain known boolean receiver methods', t => {
	const code = '/** @param {() => ReadonlyMap<string, number>} read */ function run(read) { inspect(read().has(key)); }';
	t.assert.deepStrictEqual(getInferences(code), [['boolean']]);
});

test('native primitive and array return syntax uses the existing receiver classifiers', t => {
	const code = 'type Label = "left" | "right"; function text(): string { return source; } function label(): Label { return source; } function values(): readonly string[] { return source; } function tuple(): [number] { return source; } inspect(text().includes("x")); inspect(label().startsWith("l")); inspect(values().some(predicate)); inspect(tuple().every(predicate));';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['boolean'], ['boolean'], ['boolean'], ['boolean']]);
});

test('native nullish string and array return unions stay uncertain for receiver inference', t => {
	const code = 'function text(): string | undefined { return source; } function values(): string[] | null { return source; } inspect(text().includes("x")); inspect(values().some(predicate));';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[], []]);
});

test('transparent function wrappers preserve documented boolean call results', t => {
	for (const initializer of ['() => source', 'function () { return source; }']) {
		for (const wrap of [value => `(${value})!`, value => `(${value}) satisfies (() => boolean)`, value => `((${value}) satisfies (() => boolean))!`]) {
			const code = `/** @returns {boolean} */ const read = ${wrap(initializer)}; inspect(read); inspect(read());`;
			t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[], ['boolean']], code);
		}
	}
});

test('transparent function wrappers retain uncertain documented boolean returns', t => {
	for (const type of ['unknown', 'boolean | undefined', '?boolean']) {
		const code = `/** @returns {${type}} */ const read = ((() => true) satisfies (() => boolean))!; inspect(read());`;
		t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]], type);
	}
});

test('transparent function wrappers do not expose async or generator boolean returns', t => {
	for (const initializer of ['async () => source', 'function* () { return source; }']) {
		const code = `/** @returns {boolean} */ const read = ((${initializer}) satisfies (() => unknown))!; inspect(read());`;
		t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]], initializer);
	}
});

test('transparent function wrappers keep asserted callable types authoritative', t => {
	for (const initializer of ['((() => source) as (() => string))!', '((<() => string>(() => source)) satisfies (() => string))!']) {
		const code = `/** @returns {boolean} */ const read = ${initializer}; inspect(read());`;
		t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]], initializer);
	}
});

test('native return annotations keep precedence through transparent documented function wrappers', t => {
	const code = '/** @returns {boolean} */ const text = (((): string => source) satisfies (() => string))!; /** @returns {string} */ const flag = (((): boolean => source) satisfies (() => boolean))!; inspect(text()); inspect(flag());';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['string'], ['boolean']]);
});

test('receiver return annotations recognize named built-ins without resolving Array subclasses', t => {
	const code = 'class Values extends Array { includes() { return "changed"; } } function inherited(): Values { return source; } function direct(): Array<string> { return source; } inspect(inherited().includes("x")); inspect(direct().includes("x"));';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[], ['boolean']]);
});

test('uncertain documented return values cannot prove a boolean receiver method', t => {
	for (const declaration of [
		'/** @returns {?string} */ function text() { return source; }',
		'/** @returns {string} */ async function text() { return source; }',
		'/** @returns {string} */ function* text() { return source; }',
		'/** @returns {string} */ let text = () => source; text = source;',
	]) {
		t.assert.deepStrictEqual(getInferences(`${declaration} inspect(text().includes("x"));`), [[]], declaration);
	}
});

test('native function return annotations override conflicting callable binding documentation', t => {
	const code = '/** @type {() => Array<string>} */ const read = (): string => source; inspect(read());';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['string']]);
});

test('native return alias scope keeps boolean and string classifiers consistent', t => {
	for (const [code, expected] of [
		['type Result = string; /** @type {() => boolean} */ const read = (): Result => { type Result = boolean; return "text"; }; inspect(read());', ['string']],
		['type Result = boolean; /** @type {() => string} */ const read = (): Result => { type Result = string; return source; }; inspect(read());', ['boolean']],
	]) {
		t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [expected]);
	}
});

test('async and generator syntax cannot be overridden by synchronous callable documentation', t => {
	const code = '/** @type {() => string[]} */ const read = async () => source; /** @type {() => string[]} */ const generate = function* () { return source; }; inspect(read()); inspect(generate());';
	t.assert.deepStrictEqual(getInferences(code), [[], []]);
});

test('mutable callable bindings cannot disguise async or generator results', t => {
	for (const declaration of ['let', 'var']) {
		for (const initializer of ['async () => source', 'async function () { return source; }', 'function* () { return source; }', 'async function* () { return source; }']) {
			t.assert.deepStrictEqual(getInferences(`/** @type {() => string[]} */ ${declaration} read = ${initializer}; inspect(read());`), [[]], `${declaration} ${initializer}`);
		}
	}
});

test('unwritten mutable functions preserve synchronous documented returns', t => {
	for (const declaration of ['let', 'var']) {
		for (const documentation of ['@type {() => string[]}', '@returns {string[]}']) {
			const code = `/** ${documentation} */ ${declaration} read = () => source; inspect(read());`;
			t.assert.deepStrictEqual(getInferences(code), [['array', 'indexed']], `${declaration} ${documentation}`);
		}
	}
});

test('unwritten mutable boolean functions preserve documented return contracts', t => {
	for (const declaration of ['let', 'var']) {
		for (const initializer of ['() => source', 'function () { return source; }']) {
			const code = `/** @returns {boolean} */ ${declaration} read = ${initializer}; inspect(read); inspect(read());`;
			t.assert.deepStrictEqual(getInferences(code), [[], ['boolean']], code);
		}
	}
});

test('mutable boolean function return inference excludes subsequent writes and async results', t => {
	for (const declaration of ['let', 'var']) {
		for (const suffix of ['read = other;', 'function replace() { read = other; }']) {
			const code = `/** @returns {boolean} */ ${declaration} read = () => source; ${suffix} inspect(read());`;
			t.assert.deepStrictEqual(getInferences(code), [[]], code);
		}

		for (const initializer of ['async () => source', 'function* () { return source; }']) {
			const code = `/** @returns {boolean} */ ${declaration} read = ${initializer}; inspect(read());`;
			t.assert.deepStrictEqual(getInferences(code), [[]], code);
		}
	}
});

test('native function return annotations override documented and literal boolean results', t => {
	for (const declaration of ['function', 'const', 'let', 'var']) {
		for (const [returnType, expected] of [['string', ['string']], ['unknown', []], ['boolean | undefined', []]]) {
			const binding = declaration === 'function'
				? `function read(): ${returnType} { return true; }`
				: `${declaration} read = (): ${returnType} => true;`;
			const code = `/** @returns {boolean} */ ${binding} inspect(read());`;
			t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [expected], code);
		}
	}
});

test('native callable binding uncertainty cannot be narrowed by initializer return annotations', t => {
	for (const declaration of ['const', 'let', 'var']) {
		for (const [returnType, value] of [['boolean', 'true'], ['string', '"text"'], ['string[]', '[]']]) {
			const code = `/** @returns {${returnType}} */ ${declaration} read: () => unknown = (): ${returnType} => ${value}; inspect(read());`;
			t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]], code);
		}
	}
});

test('native callable binding contracts remain authoritative over narrower implementations and assertions', t => {
	for (const bindingType of ['unknown', '() => string', '() => boolean | undefined', '(() => boolean) | undefined']) {
		for (const initializer of ['(): boolean => true', '(() => true) as (() => boolean)']) {
			const code = `/** @returns {boolean} */ const read: ${bindingType} = ${initializer}; inspect(read());`;
			t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]], code);
		}
	}

	const code = '/** @returns {string} */ const read: () => boolean = (): string => "text"; inspect(read());';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['boolean']]);
});

test('native receiver parameter types use shared boolean method classification', t => {
	const code = 'function run(text: string, values: readonly string[], tuple: [number], keys: ReadonlyMap<string, number>, pattern: RegExp) { inspect(text.includes("x")); inspect(values.some(predicate)); inspect(tuple.every(predicate)); inspect(keys.has("x")); inspect(pattern.global); }';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['boolean'], ['boolean'], ['boolean'], ['boolean'], ['boolean']]);
});

test('documented callable intersections require every overload result to be boolean', t => {
	for (const type of [
		'((value: string) => boolean) & ((value: number) => string)',
		'((value: number) => string) & ((value: string) => boolean)',
		'(() => boolean) & (() => boolean | undefined)',
		'(() => boolean) & (() => unknown)',
		'((() => boolean) & {name: string}) & ((() => string) & {tag: string})',
	]) {
		const code = `/** @type {${type}} */ const read = source; inspect(read(1));`;
		t.assert.deepStrictEqual(getInferences(code), [[]], type);
	}
});

test('documented boolean overloads retain certainty with record metadata and grouping', t => {
	for (const type of [
		'((value: string) => boolean) & ((value: number) => boolean)',
		'((() => boolean) & {name: string}) & ((() => true) & {tag: string})',
		'((value: string) => boolean) | ((value: number) => boolean)',
	]) {
		const code = `/** @type {${type}} */ const read = source; inspect(read); inspect(read(1));`;
		t.assert.deepStrictEqual(getInferences(code), [[], ['boolean']], type);
	}
});

test('documented callable objects expose their call results without classifying their bindings as primitives', t => {
	for (const typescript of [false, true]) {
		for (const [type, expected] of [
			['{(value: string): boolean; description: string}', ['boolean']],
			['{(): string}', ['string']],
			['{(): Array<string>; readonly label: string}', ['array', 'indexed']],
			['{(value: string): boolean; (value: number): true}', ['boolean']],
		]) {
			const code = `/** @type {${type}} */ const read = source; inspect(read); inspect(read("x"));`;
			t.assert.deepStrictEqual(getInferences(code, {typescript}), [[], expected], code);
		}
	}
});

test('documented callable objects remain known nonprimitive values', t => {
	const code = '/** @type {{(): boolean; label: string}} */ const read = source; inspect(read);';
	const checks = {nonString: isKnownNonString, nonNumber: isKnownNonNumber, nonArray: isKnownNonArray};
	t.assert.deepStrictEqual(getInferences(code, {checks}), [['nonString', 'nonNumber', 'nonArray']]);
});

test('documented callable objects retain uncertainty and do not unwrap higher-order results', t => {
	for (const type of [
		'{(value: string): boolean; (value: number): string}',
		'{(): boolean; (value: string): unknown}',
		'{(): () => boolean}',
		'?{(): boolean}',
		'({(): boolean}) | undefined',
		'{(): boolean | undefined}',
	]) {
		const code = `/** @type {${type}} */ const read = source; inspect(read("x"));`;
		t.assert.deepStrictEqual(getInferences(code), [[]], type);
	}

	const code = '/** @param {{(): boolean}} [read] */ function run(read) { inspect(read()); }';
	t.assert.deepStrictEqual(getInferences(code), [[]]);
});

test('documented method properties do not make their containing object callable', t => {
	for (const type of ['{read(): boolean}', '{readonly(): boolean}', '{readonly read(): boolean}']) {
		const code = `/** @type {${type}} */ const read = source; inspect(read); inspect(read());`;
		t.assert.deepStrictEqual(getInferences(code), [[], []], type);
	}
});

test('documented callable object results supply string and array receiver facts', t => {
	const code = '/** @type {{(): string}} */ const text = source; /** @type {{(): string[]}} */ const values = source; inspect(text().includes("x")); inspect(values().some(predicate));';
	t.assert.deepStrictEqual(getInferences(code), [['boolean'], ['boolean']]);
});

test('documented scalar and scalar-callable combinations do not prove boolean call results', t => {
	for (const type of ['boolean', 'boolean | (() => boolean)', 'boolean & (() => boolean)', '(() => boolean) | (boolean & (() => boolean))']) {
		const code = `/** @type {${type}} */ const read = source; inspect(read());`;
		t.assert.deepStrictEqual(getInferences(code), [[]], type);
	}
});

test('native callback return annotations override documented overload results', t => {
	const code = '/** @type {(() => boolean) & (() => string)} */ const flag = (): boolean => source; /** @type {(() => boolean) & (() => true)} */ const text = (): string => source; inspect(flag()); inspect(text());';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['boolean'], ['string']]);
});

test('simple rest arrays supply boolean receiver methods without documentation', t => {
	const code = 'function run(...values) { inspect(values.includes(item)); inspect(values.some(predicate)); inspect(values.every(predicate)); }';
	t.assert.deepStrictEqual(getInferences(code), [['boolean'], ['boolean'], ['boolean']]);
});

test('uncertain receiver parameters retain shared nullish and rest write boundaries', t => {
	const code = 'function run(text?: string, values: string[] | null) { inspect(text.includes("x")); inspect(values.some(predicate)); } function rest(...values) { values = other; inspect(values.every(predicate)); }';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[], [], []]);
});

test('receiver aliases reuse native type resolution without inheriting conflicting documentation', t => {
	const code = 'type Words = readonly string[]; type Text = "left" | "right"; /** @param {string} values\n * @param {Array<number>} text */ function run(values: Words, text: Text) { const list = values; const label = text; inspect(list.every(predicate)); inspect(label.endsWith("t")); }';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['boolean'], ['boolean']]);
});

test('receiver aliases cannot bypass documented uncertainty or recursive native types', t => {
	const code = '/** @type {unknown} */ const values = []; const alias = values; inspect(alias.every(predicate)); type Recursive = Recursive; function run(text: Recursive) { inspect(text.includes("x")); }';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[], []]);
});

test('rest receiver inference stops at ordinary shadowed parameters and closure writes', t => {
	const code = 'function outer(...values) { function inner(values) { inspect(values.includes(item)); } } function rest(...values) { function replace() { values = other; } inspect(values.some(predicate)); }';
	t.assert.deepStrictEqual(getInferences(code), [[], []]);
});

test('explicit receiver annotations keep their existing trust after writes', t => {
	const code = '/** @param {Array<string>} values */ function run(values, text: string) { values = other; text = other; inspect(values.every(predicate)); inspect(text.includes("x")); }';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['boolean'], ['boolean']]);
});

test('receiver classification preserves unsupported subclass and boxed native string boundaries', t => {
	const code = 'class Values extends Array { some() { return "changed"; } } function run(values: Values, text: String) { inspect(values.some(predicate)); inspect(text.includes("x")); }';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[], []]);
});

test('reassigned mutable function initializers stay unknown despite documented synchronous returns', t => {
	for (const declaration of ['let', 'var']) {
		const code = `/** @returns {string[]} */ ${declaration} read = () => source; read = other; inspect(read());`;
		t.assert.deepStrictEqual(getInferences(code), [[]], declaration);
	}
});

test('TypeScript wrappers cannot disguise known async or generator callable initializers', t => {
	for (const declaration of ['const', 'let', 'var']) {
		for (const initializer of ['async () => source', 'function* () { return source; }']) {
			for (const wrap of [value => `(${value}) as (() => string[])`, value => `<() => string[]>(${value})`, value => `(${value})!`, value => `(${value}) satisfies (() => string[])`]) {
				const code = `/** @type {() => string[]} */ ${declaration} read = ${wrap(initializer)}; inspect(read());`;
				t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]], code);
			}
		}
	}
});

for (const [name, initializer] of [['boolean', 'true'], ['string', '"text"'], ['number', '1'], ['bigint', '1n'], ['array', '[]']]) {
	test(`explicit unknown ${name} stays unknown through aliases and transparent expressions`, t => {
		for (const expression of ['value!', 'value as unknown', '(0, value)']) {
			const code = `/** @type {unknown} */ const value = ${initializer}; inspect(${expression});`;
			t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]], expression);
		}

		for (const declaration of ['const', 'let', 'var']) {
			for (const expression of ['alias', 'alias!', 'alias as unknown', '(0, alias)']) {
				const code = `/** @type {unknown} */ const value = ${initializer}; ${declaration} alias = value; inspect(${expression});`;
				t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]], `${declaration} ${expression}`);
			}
		}
	});
}

test('type assertions and inherent result types retain certainty when their input has an unknown annotation', t => {
	for (const [expression, expected] of [
		['value as boolean', ['boolean']],
		['value as string', ['string']],
		['value as bigint', ['bigint']],
		['value as string[]', ['array', 'indexed']],
		['value satisfies string', ['string']],
		['Boolean(value)', ['boolean']],
		['typeof value', ['string']],
		['[value]', ['array', 'indexed']],
		['+value', ['number']],
		['value >>> 0', ['number']],
		['value === 1', ['boolean']],
		['!value', ['boolean']],
		['String(value)', ['string']],
		['Number(value)', ['number']],
		['BigInt(value)', ['bigint']],
	]) {
		const code = `/** @type {unknown} */ const value = source; inspect(${expression});`;
		t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [expected], expression);
	}
});

test('ordinary constant aliases and transparent expressions keep their static inference', t => {
	const code = 'const flag = true; const alias = flag; inspect(alias!); const text = "ready"; inspect((0, text)); const count = 1n; inspect(count as unknown); const values = []; inspect(values!);';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['boolean'], ['string'], ['bigint'], ['array', 'indexed']]);
});

test('non-computed property names do not inherit unrelated annotation uncertainty', t => {
	const code = '/** @type {unknown} */ const value = source; inspect({value: true}.value); inspect({value: "text"}.value); inspect({value: 1}.value); inspect({value: 1n}.value);';
	t.assert.deepStrictEqual(getInferences(code), [['boolean'], ['string'], ['number'], ['bigint']]);
});

test('computed property annotations prevent static lookup from bypassing uncertain keys', t => {
	const code = '/** @type {unknown} */ const key = "slot"; inspect({slot: true}[key]); inspect({slot: "text"}[key]); inspect({slot: 1}[key]); inspect({slot: 1n}[key]); inspect({slot: []}[key]);';
	t.assert.deepStrictEqual(getInferences(code), [[], [], [], [], []]);
});

test('numeric conditional inference does not bypass documented condition uncertainty', t => {
	const code = '/** @type {unknown} */ const flag = true; const alias = flag; inspect(flag ? 1 : "text"); inspect(flag ? "text" : 1); inspect(alias ? 1 : "text"); inspect(flag ? 1 : 2);';
	t.assert.deepStrictEqual(getInferences(code), [[], [], [], ['number']]);
	t.assert.deepStrictEqual(getInferences('/** @type {unknown} */ const flag = false; inspect(flag ? "text" : 1);'), [[]]);
});

test('numeric conditional uncertainty survives transparent wrappers around the test', t => {
	for (const expression of ['flag!', 'flag as unknown']) {
		const code = `/** @type {unknown} */ const flag = true; inspect(${expression} ? 1 : "text");`;
		t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]], expression);
	}
});

test('ordinary static conditions keep numeric branch inference without documentation', t => {
	const code = 'const flag = true; inspect(flag ? 1 : "text"); inspect(!flag ? "text" : 1); inspect(flag ? 1 : 2);';
	t.assert.deepStrictEqual(getInferences(code), [['number'], ['number'], ['number']]);
});

test('constant computed keys without annotations retain static lookup inference', t => {
	const code = 'const key = "slot"; inspect({slot: true}[key]); inspect({slot: "text"}[key]); inspect({slot: 1}[key]); inspect({slot: 1n}[key]); inspect({slot: []}[key]);';
	t.assert.deepStrictEqual(getInferences(code), [['boolean'], ['string'], ['number'], ['bigint'], ['array', 'indexed']]);
});

for (const [type, initializer, expected] of [
	['boolean', 'true', ['boolean']],
	['string', '"text"', ['string']],
	['number', '1', ['number']],
	['bigint', '1n', ['bigint']],
	['string[]', '[]', ['array', 'indexed']],
]) {
	test(`known documented ${type} aliases keep their positive type evidence`, t => {
		for (const expression of ['alias', 'alias!', 'alias as unknown', '(0, alias)']) {
			const code = `/** @type {${type}} */ const value = ${initializer}; const alias = value; inspect(${expression});`;
			t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [expected], expression);
		}
	});
}

test('asserted callable initializers do not use conflicting JSDoc return evidence', t => {
	for (const initializer of [
		'(() => "text") as (() => string)',
		'<() => string>(() => "text")',
		'((() => "text") as (() => string))!',
		'((() => "text") as (() => string)) satisfies (() => string)',
	]) {
		const code = `/** @type {() => string[]} */ const read = ${initializer}; inspect(read());`;
		t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]], initializer);
	}
});

test('contextual callback parameter names preserve outer and return types independently', t => {
	const code = '/** @param {(is: string) => string} read\n * @param {Array<{test(infer: string): boolean}>} list */ function run(read, list) { inspect(read); inspect(read("text")); inspect(list); }';
	for (const typescript of [false, true]) {
		t.assert.deepStrictEqual(getInferences(code, {typescript}), [[], ['string'], ['array', 'indexed']]);
	}
});

for (const [type, expected] of [
	['boolean', ['boolean']],
	['string', ['string']],
	['number', ['number']],
	['bigint', ['bigint']],
	['string[]', ['array', 'indexed']],
]) {
	test(`native optional markers keep documented ${type} parameters uncertain`, t => {
		const code = `/** @param {${type}} value */ function run(value?) { inspect(value); }`;
		t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]]);
		const required = `/** @param {${type}} value */ function run(value) { inspect(value); }`;
		t.assert.deepStrictEqual(getInferences(required, {typescript: true}), [expected]);
	});
}

test('native optional markers also guard documented callback results and receiver methods', t => {
	const code = '/** @param {() => boolean} read */ function run(read?) { inspect(read()); } /** @param {string} text */ function other(text?) { inspect(text.includes("x")); }';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[], []]);
});

for (const [returnType, expected] of [
	['string', ['string']],
	['number', ['number']],
	['bigint', ['bigint']],
	['string[]', ['array', 'indexed']],
	['Set<string>', ['set']],
]) {
	test(`documented callable groups retain their ${returnType} result without changing the binding type`, t => {
		for (const type of [
			`(() => ${returnType}) | ((value: string) => ${returnType})`,
			`(() => ${returnType}) & ({label: string} & {tag: number})`,
		]) {
			const code = `/** @type {${type}} */ let read; inspect(read); inspect(read());`;
			t.assert.deepStrictEqual(getInferences(code), [[], expected], type);
			t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[], expected], type);
		}
	});
}

test('documented callable parameter unions classify their call result', t => {
	const code = '/** @param {(() => string[]) | ((value: number) => string[])} read */ function run(read) { inspect(read()); }';
	t.assert.deepStrictEqual(getInferences(code), [['array', 'indexed']]);
});

for (const [description, type] of [
	['mixed returns', '(() => string) & (() => number)'],
	['unknown returns', '(() => string) | (() => unknown)'],
	['nullable returns', '(() => string) & (() => string | null)'],
	['nullable callable union', '(() => string) | undefined'],
	['optional metadata callable', '((() => string) & {label: string})='],
	['nullable metadata callable', '?((() => string) & {label: string})'],
	['scalar union', 'string | (() => string)'],
	['scalar intersection', 'string & (() => string)'],
	['record containing a callable', '{read: () => string}'],
]) {
	test(`documented callable ${description} cannot establish a definite result`, t => {
		t.assert.deepStrictEqual(getInferences(`/** @type {${type}} */ let read; inspect(read());`), [[]]);
	});
}

test('callable metadata and unions cannot hide async, generator, or reassigned bindings', t => {
	for (const initializer of ['async () => source', 'function* () { return source; }']) {
		const code = `/** @type {(() => string[]) & {label: string}} */ const read = ${initializer}; inspect(read());`;
		t.assert.deepStrictEqual(getInferences(code), [[]], initializer);
	}

	const code = '/** @type {(() => string) | (() => string)} */ let read = source; function replace() { read = other; } inspect(read());';
	t.assert.deepStrictEqual(getInferences(code), [[]]);
});

test('native annotations and assertions remain authoritative over grouped callable documentation', t => {
	for (const declaration of [
		'const read: () => unknown = source;',
		'const read = source as (() => unknown);',
	]) {
		const code = `/** @type {(() => string) & {label: string}} */ ${declaration} inspect(read());`;
		t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]], declaration);
	}

	const code = '/** @type {(() => string) | (() => string)} */ const read = (): number => source; inspect(read());';
	t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [['number']]);
});

for (const [returnType, expected] of [
	['boolean', ['boolean']],
	['string', ['string']],
	['number', ['number']],
	['bigint', ['bigint']],
	['string[]', ['array', 'indexed']],
]) {
	test(`documented ${returnType} callback parameters cannot hide async or generator defaults`, t => {
		for (const initializer of ['async () => source', 'function* () { return source; }', 'async function* () { return source; }']) {
			const code = `/** @param {() => ${returnType}} read */ function run(read = ${initializer}) { inspect(read()); }`;
			t.assert.deepStrictEqual(getInferences(code), [[]], initializer);
		}

		const code = `/** @param {() => ${returnType}} read */ function run(read = () => source) { inspect(read()); }`;
		t.assert.deepStrictEqual(getInferences(code), [expected]);
	});
}

test('transparent wrappers cannot hide async defaults of documented callback parameters', t => {
	for (const initializer of ['async () => source', 'function* () { return source; }']) {
		for (const wrap of [value => `(${value})!`, value => `(${value}) satisfies (() => boolean)`, value => `(${value}) as (() => boolean)`]) {
			const code = `/** @param {() => boolean} read */ function run(read = ${wrap(initializer)}) { inspect(read()); }`;
			t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]], code);
		}
	}
});

test('native default callback return types cannot replace the documented caller contract', t => {
	for (const [documented, native] of [['boolean', 'string'], ['string', 'boolean'], ['string[]', 'Set<string>']]) {
		const code = `/** @param {() => ${documented}} read */ function run(read = (): ${native} => source) { inspect(read()); }`;
		t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [[]], code);
	}
});

test('constructor parameter callback defaults retain async and synchronous boundaries', t => {
	for (const [initializer, expected] of [['async () => source', []], ['() => source', ['boolean']]]) {
		const code = `class Task { /** @param {() => boolean} read */ constructor(public read = ${initializer}) { inspect(read()); } }`;
		t.assert.deepStrictEqual(getInferences(code, {typescript: true}), [expected], initializer);
	}
});

test('empty object annotations do not establish primitive or non-primitive certainty', t => {
	const checks = {
		...predicates,
		nonString: isKnownNonString,
		nonNumber: isKnownNonNumber,
		nonBigint: isKnownNonBigInt,
		nonArray: isKnownNonArray,
	};
	for (const type of ['{}', 'boolean | {}', 'boolean & {}']) {
		const code = `/** @type {${type}} */ const value = true; inspect(value);`;
		t.assert.deepStrictEqual(getInferences(code, {checks}), [[]], type);
		t.assert.deepStrictEqual(getInferences(code, {checks, typescript: true}), [[]], type);
	}
});

test('empty object callable metadata remains uncertain while nested argument types preserve the outer result', t => {
	t.assert.deepStrictEqual(getInferences('/** @type {(() => boolean) & {}} */ let read; inspect(read());'), [[]]);
	t.assert.deepStrictEqual(getInferences('/** @type {Array<{}>} */ let values; inspect(values);'), [['array', 'indexed']]);
	t.assert.deepStrictEqual(getInferences('/** @param {function({}): boolean} read */ function run(read) { inspect(read()); }'), [['boolean']]);
});

test('reference scans do not resolve bindings in files without documentation comments', t => {
	for (const comments of [[], [{type: 'Line', value: '* @type {boolean} value'}], [{type: 'Block', value: ' @type {boolean} '}]]) {
		const context = {
			sourceCode: {
				getAllComments: () => comments,
				getScope() {
					throw new Error('A file without documentation must not resolve bindings for a documentation scan.');
				},
			},
		};
		t.assert.strictEqual(hasJSDocumentTypeReference({type: 'Identifier', name: 'value'}, context), false);
	}
});

test('reference scans retain documentation evidence across aliases and source files', t => {
	const checks = {documented: hasJSDocumentTypeReference};
	for (const [comment, expected] of [
		['', []],
		['/** Description only. */', []],
		['/** @type {unknown} */', ['documented']],
		['/* @type {boolean} */', []],
		['/** @type {boolean} */', ['documented']],
	]) {
		const code = `${comment} const value = source; const first = value; const alias = first; inspect(alias);`;
		t.assert.deepStrictEqual(getInferences(code, {checks}), [expected], comment);
		t.assert.deepStrictEqual(getInferences(code, {checks, typescript: true}), [expected], comment);
	}
});
