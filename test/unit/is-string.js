import test from 'node:test';
import {Linter} from 'eslint';
import isString, {isKnownNonString} from '../../rules/utils/is-string.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

const getResults = (code, inspect = isString) => {
	const results = [];
	const messages = linter.verify(code, {
		languageOptions: {
			parser: parsers.typescript.implementation,
			parserOptions: parsers.typescript.mergeParserOptions(),
		},
		plugins: {
			test: {
				rules: {
					inspect: {
						create: context => ({
							'CallExpression[callee.name="inspect"]'(node) {
								results.push(inspect(node.arguments[0], context));
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
};

test('returns `false` for a missing node', t => {
	t.assert.deepStrictEqual(getResults('inspect();'), [false]);
});

test('uses string type annotations', t => {
	t.assert.deepStrictEqual(getResults('inspect(value satisfies string); inspect(value satisfies \'foo\'); inspect(value satisfies number);'), [true, true, false]);
	t.assert.deepStrictEqual(getResults('function foo(value: string) { inspect(value); }'), [true]);
});

test('uses JSDoc string annotations without type information', t => {
	for (const type of ['string', 'String', '\'ready\'', 'string | \'ready\'']) {
		const code = `/** @param {${type}} value */ function run(value) { inspect(value); }`;
		t.assert.deepStrictEqual(getResults(code), [true], code);
	}

	t.assert.deepStrictEqual(getResults('/** @returns {string} */ function create() { return source; } inspect(create());'), [true]);
	t.assert.deepStrictEqual(getResults('/** @param {number} value */ function run(value) { inspect(value); }', isKnownNonString), [true]);
	t.assert.deepStrictEqual(getResults('/** @type {unknown} */ const value = "ready"; inspect(value);'), [false]);
	t.assert.deepStrictEqual(getResults('/** @type {number} */ const value = "ready"; inspect(value);'), [false]);
	for (const type of ['?string', 'string | undefined', 'string[]', 'Array<string>', '() => string', 'Unresolved']) {
		const code = `/** @param {${type}} value */ function run(value) { inspect(value); }`;
		t.assert.deepStrictEqual(getResults(code), [false], code);
	}
});

for (const property of ['source', 'flags']) {
	test(`RegExp ${property} metadata supplies strings through aliases and chains`, t => {
		const code = [
			'/** @param {RegExp} pattern */ function run(pattern) {',
			`inspect(pattern.${property}); const text = pattern.${property}; const alias = text; inspect(alias.trim());`,
			'}',
			`function native(pattern: RegExp) { inspect(pattern.${property}); }`,
			`/** @returns {RegExp} */ function read() { return source; } inspect(read().${property});`,
			`/** @param {() => RegExp} read */ function callback(read) { inspect(read().${property}); }`,
		].join('\n');
		t.assert.deepStrictEqual(getResults(code), [true, true, true, true, true]);
	});

	test(`RegExp ${property} metadata requires a definite receiver and direct property read`, t => {
		for (const type of ['unknown', '?RegExp', 'RegExp | string', 'Array<RegExp>', `{${property}: number}`]) {
			const code = `/** @param {${type}} pattern */ function run(pattern) { inspect(pattern.${property}); }`;
			t.assert.deepStrictEqual(getResults(code), [false], type);
		}

		const code = [
			`/** @param {RegExp} [pattern] */ function optional(pattern) { inspect(pattern.${property}); }`,
			`/** @param {RegExp} pattern */ function access(pattern) { inspect(pattern?.${property}); inspect(pattern["${property}"]); }`,
			`/** @type {unknown} */ const pattern = /value/; inspect(pattern.${property});`,
		].join('\n');
		t.assert.deepStrictEqual(getResults(code), [false, false, false, false]);
	});
}

test('RegExp metadata preserves native annotation and assertion precedence', t => {
	const code = [
		'/** @param {RegExp} pattern */ function native(pattern: {source: number; flags: boolean}) { inspect(pattern.source); inspect(pattern.flags); }',
		'/** @param {number} pattern */ function overridden(pattern: RegExp) { inspect(pattern.source); inspect(pattern.flags); }',
		'/** @param {RegExp} pattern */ function asserted(pattern) { inspect((pattern as {source: number}).source); }',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false, true, true, false]);
});

test('RegExp metadata does not resolve subclass overrides or cyclic initializers', t => {
	const code = [
		'class Pattern extends RegExp { get source() { return 42; } get flags() { return false; } }',
		'inspect(new Pattern().source); inspect(new Pattern().flags);',
		'function run(pattern: Pattern) { inspect(pattern.source); inspect(pattern.flags); }',
		'const first = second.source; const second = first.flags; inspect(first); inspect(second);',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false, false, false, false, false]);
});

/* eslint-disable no-template-curly-in-string */
test('String.raw calls and template tags produce strings with unknown substitutions', t => {
	const code = [
		'/** @param {unknown} value */ function run(value, template) {',
		'inspect(String.raw`prefix${value}`); inspect(String.raw({raw: ["prefix", ""]}, value));',
		'inspect(String.raw(template, value)); inspect(String.raw`\\n${value}`.trim().includes("x") ? String.raw`${value}` : "");',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [true, true, true, true]);
});

test('String.raw results retain aliases and explicit annotation precedence', t => {
	const code = [
		'/** @param {string} value */ function run(value) {',
		'const text = String.raw`${value}`; const alias = text; inspect(alias); inspect(alias.trim());',
		'/** @type {unknown} */ const unknown = String.raw`${value}`; inspect(unknown);',
		'const native: number = String.raw`${value}`; inspect(native); inspect(String.raw`${value}` as number);',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [true, true, false, false, false]);
});

test('arbitrary template tags and optional or computed raw calls do not gain string certainty', t => {
	const code = [
		'function run(value, tag) {',
		'inspect(tag`${value}`); inspect(other.raw`${value}`); inspect(String.other`${value}`);',
		'inspect(String.raw?.({raw: [value]})); inspect(String?.raw({raw: [value]})); inspect(String["raw"]({raw: [value]}));',
		'inspect(String["raw"]`${value}`);',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false, false, false, false, false, false]);
});

/* eslint-enable no-template-curly-in-string */

for (const method of [
	'charAt',
	'concat',
	'normalize',
	'padEnd',
	'padStart',
	'repeat',
	'slice',
	'substring',
	'toLocaleLowerCase',
	'toLocaleUpperCase',
	'toLowerCase',
	'toString',
	'toUpperCase',
	'toWellFormed',
	'trim',
	'trimEnd',
	'trimStart',
	'valueOf',
]) {
	test(`recognizes ${method} results on documented and native string receivers`, t => {
		const documented = `/** @param {string} text */ function run(text) { inspect(text.${method}()); }`;
		const native = `function run(text: string) { inspect(text.${method}()); }`;
		t.assert.deepStrictEqual(getResults(documented), [true]);
		t.assert.deepStrictEqual(getResults(native), [true]);
	});
}

test('string method chains retain callback results and constant aliases', t => {
	const code = [
		'/** @returns {string} */ function read() { return source; }',
		'const alias = read().trim(); inspect(alias.toLowerCase());',
		'/** @param {() => string} read */ function run(read) { inspect(read().slice(1).trimEnd()); }',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [true, true]);
});

test('string identity methods retain documented call results aliases and chains', t => {
	const code = [
		'/** @returns {string} */ function read() { return source; } inspect(read().toString().trim());',
		'/** @param {() => String} read */ function run(read) { const text = read().valueOf(); const alias = text; inspect(alias); inspect(alias.toString()); }',
		'/** @param {string} text */ function ignoredArguments(text) { inspect(text.toString(effect())); inspect(text.valueOf(effect())); }',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [true, true, true, true, true]);
});

for (const method of ['toString', 'valueOf']) {
	test(`string ${method} inference retains receiver and call boundaries`, t => {
		for (const type of ['unknown', '?string', 'string | number', 'Array<string>', `{${method}: () => number}`]) {
			const code = `/** @param {${type}} text */ function run(text) { inspect(text.${method}()); }`;
			t.assert.deepStrictEqual(getResults(code), [false], type);
		}

		const code = [
			`/** @param {string} [text] */ function omitted(text) { inspect(text.${method}()); }`,
			`/** @param {string} text */ function optional(text) { inspect(text?.${method}()); inspect(text.${method}?.()); inspect(text["${method}"]()); }`,
			`function boxed(text: String) { inspect(text.${method}()); }`,
		].join('\n');
		t.assert.deepStrictEqual(getResults(code), [false, false, false, false, false]);
	});
}

test('string identity methods preserve native receiver precedence', t => {
	const code = [
		'/** @param {string} text */ function native(text: {toString(): number; valueOf(): boolean}) { inspect(text.toString()); inspect(text.valueOf()); }',
		'/** @param {number} text */ function overridden(text: string) { inspect(text.toString()); inspect(text.valueOf()); }',
		'/** @param {string} text */ function asserted(text) { inspect((text as {valueOf(): number}).valueOf()); }',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false, true, true, false]);
});

test('well-formed string conversion retains uncertain receiver and optional-call boundaries', t => {
	const code = [
		'/** @param {?string} text */ function nullable(text) { inspect(text.toWellFormed()); }',
		'/** @param {unknown} text */ function unknown(text) { inspect(text.toWellFormed()); }',
		'/** @param {string} text */ function optional(text) { inspect(text?.toWellFormed()); inspect(text.toWellFormed?.()); inspect(text["toWellFormed"]()); }',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false, false, false, false]);
});

for (const type of ['Array<string | null | undefined>', 'ReadonlyArray<string>', '[string, number]', 'Uint8Array', 'BigInt64Array', 'Array<string> | Uint8Array']) {
	test(`join results on ${type} receivers are strings`, t => {
		t.assert.deepStrictEqual(getResults(`/** @param {${type}} values */ function run(values) { inspect(values.join()); inspect(values.join("|").trim()); }`), [true, true]);
		t.assert.deepStrictEqual(getResults(`function run(values: ${type}) { inspect(values.join()); }`), [true]);
	});
}

test('join inference retains uncertain and non-array receiver boundaries', t => {
	for (const type of ['?Array<string>', 'Array<string> | undefined', 'Array<string> | string', 'Set<string>', 'ArrayLike<string>', '{join(): number}', 'unknown']) {
		t.assert.deepStrictEqual(getResults(`/** @param {${type}} values */ function run(values) { inspect(values.join()); }`), [false], type);
	}

	const code = '/** @param {Array<string>} values */ function run(values) { inspect(values?.join()); inspect(values.join?.()); inspect(values["join"]()); inspect(values.toString()); }';
	t.assert.deepStrictEqual(getResults(code), [false, false, false, false]);
});

test('join inference follows documented factories and callable results', t => {
	const code = [
		'/** @returns {Array<string>} */ function read() { return source; } const alias = read(); inspect(alias.join());',
		'/** @param {() => BigInt64Array} read */ function run(read) { inspect(read().join()); }',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [true, true]);
});

test('string method results preserve uncertain and non-string receiver boundaries', t => {
	for (const type of ['?string', 'string | undefined', 'string | number', 'unknown', 'Array<string>', '{trim(): string}']) {
		const code = `/** @param {${type}} text */ function run(text) { inspect(text.trim()); }`;
		t.assert.deepStrictEqual(getResults(code), [false], type);
	}
});

test('optional calls and unrelated or computed string methods remain uncertain', t => {
	const code = [
		'/** @param {string} text */ function run(text) {',
		' inspect(text?.trim()); inspect(text.trim?.()); inspect(text["trim"]());',
		' inspect(text.at(0)); inspect(text.split("")); inspect(text.unknown());',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false, false, false, false, false]);
});

test('delegating replacement methods do not promise string results', t => {
	const code = [
		'const pattern = {[Symbol.replace]() { return 123; }};',
		'/** @param {string} text */ function run(text) {',
		' inspect(text.replace(pattern, "")); inspect(text.replaceAll(pattern, ""));',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false]);
});

test('native receiver annotations remain authoritative in string method chains', t => {
	const code = [
		'/** @param {string} text */ function run(text: number) { inspect(text.trim()); }',
		'/** @param {number} text */ function other(text: string) { inspect(text.trim()); }',
		'function boxed(text: String) { inspect(text.trim()); }',
		'/** @param {string} text */ function asserted(text) { inspect((text as number).trim()); }',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, true, false, false]);
});

test('string method chains preserve explicit annotation trust and reject reassigned inferred receivers', t => {
	const code = [
		'/** @type {string} */ let documented = source; documented = other; inspect(documented.trim());',
		'let inferred = "text"; inferred = other; inspect(inferred.trim());',
		'/** @type {unknown} */ const uncertain = "text"; inspect(uncertain.trim());',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [true, false, false]);
});

test('string method inference terminates on cyclic receiver aliases', t => {
	t.assert.deepStrictEqual(getResults('const text = text.join(); inspect(text);'), [false]);
	t.assert.deepStrictEqual(getResults('const text = text.trim(); inspect(text);'), [false]);
	t.assert.deepStrictEqual(getResults('const first = second.trim(); const second = first.toUpperCase(); inspect(first); inspect(second);'), [false, false]);
	t.assert.deepStrictEqual(getResults('const text = text.toString(); inspect(text);'), [false]);
	t.assert.deepStrictEqual(getResults('const first = second.valueOf(); const second = first.toString(); inspect(first); inspect(second);'), [false, false]);
});

test('terminates when concatenation references its own initializer', t => {
	t.assert.deepStrictEqual(getResults('const text = text + ""; inspect(text);'), [true]);
	t.assert.deepStrictEqual(getResults('const text = text + text; inspect(text);'), [false]);
	t.assert.deepStrictEqual(getResults('const first = second + first; const second = first; inspect(first); inspect(second);'), [false, false]);
	t.assert.deepStrictEqual(getResults('const first = second + ""; const second = first; inspect(first); inspect(second);'), [true, true]);
});

test('recognizes concrete concatenation references independently', t => {
	t.assert.deepStrictEqual(getResults('const text = "foo"; const alias = text; inspect(alias + alias);'), [true]);
	t.assert.deepStrictEqual(getResults('const number = 1; const alias = number; inspect(alias + alias);'), [false]);
});

test('terminates when assignments reference their own initializer', t => {
	t.assert.deepStrictEqual(getResults('const text = (text += ""); inspect(text);'), [true]);
	t.assert.deepStrictEqual(getResults('const text = (text = text + ""); inspect(text);'), [true]);
	t.assert.deepStrictEqual(getResults('const text = (text = text); inspect(text);'), [false]);
	t.assert.deepStrictEqual(getResults('const first = (second += first); const second = first; inspect(first); inspect(second);'), [false, false]);
});

test('known non-string checks distinguish annotations from cyclic concatenations', t => {
	t.assert.deepStrictEqual(getResults('function foo(text: string, number: number) { inspect(text); inspect(number); }', isKnownNonString), [false, true]);
	t.assert.deepStrictEqual(getResults('const text = text + ""; inspect(text);', isKnownNonString), [false]);
	t.assert.deepStrictEqual(getResults('const first = second + first; const second = first; inspect(first); inspect(second);', isKnownNonString), [false, false]);
});

for (const method of ['toISOString', 'toUTCString', 'toDateString', 'toTimeString', 'toLocaleDateString', 'toLocaleTimeString', 'toString', 'toLocaleString']) {
	test(`recognizes ${method} results on documented and native Date receivers`, t => {
		t.assert.deepStrictEqual(getResults(`/** @param {Date} value */ function run(value) { inspect(value.${method}()); }`), [true]);
		t.assert.deepStrictEqual(getResults(`function run(value: Date) { inspect(value.${method}()); }`), [true]);
	});
}

test('date formatting results propagate through documented factories aliases and string chains', t => {
	const code = [
		'/** @returns {Date} */ function read() { return source; } inspect(read().toISOString());',
		'/** @param {Date} value */ function run(value) { const text = value.toUTCString(); const alias = text; inspect(alias); inspect(alias.trim()); }',
		'inspect(new Date(0).toISOString());',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [true, true, true, true]);
});

test('date formatting requires definite receivers and preserves annotation precedence', t => {
	for (const type of ['unknown', '?Date', 'Date | string', '{toISOString: () => number}']) {
		t.assert.deepStrictEqual(getResults(`/** @param {${type}} value */ function run(value) { inspect(value.toISOString()); }`), [false], type);
	}

	const code = [
		'/** @param {Date} [value] */ function optional(value) { inspect(value.toISOString()); }',
		'/** @param {Date} value */ function access(value) { inspect(value?.toISOString()); inspect(value.toISOString?.()); inspect(value["toISOString"]()); }',
		'/** @param {Date} value */ function native(value: {toISOString(): number}) { inspect(value.toISOString()); }',
		'/** @param {{toISOString: () => number}} value */ function overridden(value: Date) { inspect(value.toISOString()); }',
		'/** @param {Date} value */ function json(value) { inspect(value.toJSON()); inspect(value.getTime()); inspect(value.valueOf()); }',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false, false, false, false, true, false, false, false]);
});

for (const name of ['Date', 'encodeURI', 'encodeURIComponent', 'decodeURI', 'decodeURIComponent', 'atob', 'btoa']) {
	test(`${name} returns strings for unknown and documented arguments`, t => {
		const code = [
			`function run(value, ...values) { inspect(${name}(value)); inspect(${name}()); inspect(${name}(...values)); }`,
			`/** @param {unknown} value */ function documented(value) { inspect(${name}(value)); }`,
		].join('\n');
		t.assert.deepStrictEqual(getResults(code), [true, true, true, true]);
	});
}

test('Date function results retain aliases chains and annotation precedence', t => {
	const code = [
		'/** @param {unknown} value */ function run(value) {',
		'const text = Date(value); const alias = text; inspect(alias); inspect(alias.trim());',
		'/** @type {unknown} */ const uncertain = Date(value); inspect(uncertain);',
		'const native: number = Date(value); inspect(native); inspect(Date(value) as number);',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [true, true, false, false, false]);
});

test('Date function inference does not turn constructors timestamp methods or indirect calls into strings', t => {
	const code = [
		'function run(value) {',
		'inspect(new Date(value)); inspect(Date.now()); inspect(Date.parse(value)); inspect(Date.UTC(value));',
		'inspect(Date?.(value)); inspect(globalThis.Date(value)); inspect(other.Date(value)); inspect(Date.call(undefined, value));',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false, false, false, false, false, false, false]);
});

test('URI string results retain aliases chains and annotation precedence', t => {
	const code = [
		'/** @param {unknown} value */ function run(value) {',
		'const text = encodeURIComponent(value); const alias = text; inspect(alias); inspect(alias.trim());',
		'/** @type {unknown} */ const uncertain = decodeURI(value); inspect(uncertain);',
		'const native: number = encodeURI(value); inspect(native); inspect(decodeURIComponent(value) as number);',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [true, true, false, false, false]);
});

test('URI inference only recognizes direct nonoptional global calls', t => {
	const code = [
		'function run(value) {',
		'inspect(encodeURI?.(value)); inspect(globalThis.encodeURI(value)); inspect(other.encodeURI(value));',
		'inspect(encodeOther(value)); inspect(new encodeURIComponent(value));',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false, false, false, false]);
});

test('base64 string results retain aliases chains and explicit annotation precedence', t => {
	const code = [
		'/** @param {unknown} value */ function run(value) {',
		'const text = atob(value); const alias = text; inspect(alias); inspect(alias.slice(1));',
		'/** @type {unknown} */ const uncertain = btoa(value); inspect(uncertain);',
		'const native: number = atob(value); inspect(native); inspect(btoa(value) as number);',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [true, true, false, false, false]);
});

test('base64 inference retains direct nonoptional call boundaries', t => {
	const code = [
		'function run(value) {',
		'inspect(atob?.(value)); inspect(globalThis.atob(value)); inspect(other.btoa(value));',
		'inspect(encodeBase64(value)); inspect(new btoa(value));',
		'}',
	].join('\n');
	t.assert.deepStrictEqual(getResults(code), [false, false, false, false, false]);
});

test('recognizes string types written as templates without substitutions', t => {
	t.assert.deepStrictEqual(getResults('function check(value: `foo`) { inspect(value); }'), [true]);
	t.assert.deepStrictEqual(getResults('inspect(value satisfies `foo`);'), [true]);
	t.assert.deepStrictEqual(getResults('function check(value: ``) { inspect(value); }'), [true]);
});
