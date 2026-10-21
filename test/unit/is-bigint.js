import test from 'node:test';
import {Linter} from 'eslint';
import isBigInt from '../../rules/utils/is-bigint.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';
import parsers from '../utils/parsers.js';

const linter = new Linter();

/*
Return whether the first argument of each `check()` call in `code` is a bigint.
*/
const getVerdicts = (code, {typeAware = false, overrides} = {}) => {
	const verdicts = [];

	const messages = linter.verify(code, {
		files: ['**'],
		languageOptions: {
			parser: typeAware ? typescriptEslintParser : parsers.typescript.implementation,
			parserOptions: typeAware
				? {projectService: {allowDefaultProject: ['*.ts']}}
				: parsers.typescript.mergeParserOptions(),
		},
		plugins: {
			test: {
				rules: {
					capture: {
						create: context => ({
							'CallExpression[callee.name="check"]'(node) {
								verdicts.push(isBigInt(node.arguments[0], context, overrides));
							},
						}),
					},
				},
			},
		},
		rules: {'test/capture': 'error'},
	}, {filename: 'file.ts'});

	const fatalMessage = messages.find(message => message.fatal);
	if (fatalMessage) {
		throw new Error(fatalMessage.message);
	}

	return verdicts;
};

test('`satisfies` with a bigint type', t => {
	t.assert.deepStrictEqual(getVerdicts('check(foo satisfies bigint);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('check(foo satisfies 1n);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('check(foo satisfies 1);'), [false]);
});

test('a bigint literal type annotation', t => {
	t.assert.deepStrictEqual(getVerdicts('declare const foo: 1n; check(foo);'), [true]);
	t.assert.deepStrictEqual(getVerdicts('declare const foo: 1; check(foo);'), [false]);
});

test('uses JSDoc bigint annotations and preserves unknown types', t => {
	for (const type of ['bigint', '1n', 'bigint | 1n']) {
		t.assert.deepStrictEqual(getVerdicts(`/** @param {${type}} value */ function run(value) { check(value); }`), [true], type);
	}

	t.assert.deepStrictEqual(getVerdicts('/** @returns {bigint} */ function create() { return source; } check(create());'), [true]);
	t.assert.deepStrictEqual(getVerdicts('/** @type {unknown} */ const value = 1n; check(value);'), [false]);
	t.assert.deepStrictEqual(getVerdicts('/** @param {bigint} [value] */ function run(value) { check(value); }'), [false]);
});

test('a bigint literal type from type information', t => {
	t.assert.deepStrictEqual(getVerdicts('declare const object: {a: 1n; b: bigint; c: 1}; check(object.a); check(object.b); check(object.c);', {typeAware: true}), [true, true, false]);
});

for (const operator of ['-', '~']) {
	test(`unary ${operator} retains documented bigint operands`, t => {
		for (const type of ['bigint', '1n', 'bigint | 1n']) {
			const code = `/** @param {${type}} value */ function run(value) { check(${operator}value); check(${operator}(${operator}value)); }`;
			t.assert.deepStrictEqual(getVerdicts(code), [true, true], type);
		}

		const code = [
			'/** @returns {bigint} */ function read() { return source; }',
			`const value = ${operator}read(); const alias = value; check(alias);`,
		].join('\n');
		t.assert.deepStrictEqual(getVerdicts(code), [true]);
	});

	test(`unary ${operator} retains native bigint types with and without type information`, t => {
		const code = `type Integer = bigint; function run(value: Integer) { check(${operator}value); check(${operator}(value as bigint)); }`;
		for (const typeAware of [false, true]) {
			t.assert.deepStrictEqual(getVerdicts(code, {typeAware}), [true, true]);
		}
	});
}

test('unary bigint inference requires a definite bigint operand', t => {
	for (const type of ['unknown', '?bigint', 'bigint | undefined', 'bigint | number', 'number', 'string', 'Array<bigint>']) {
		const code = `/** @param {${type}} value */ function run(value) { check(-value); check(~value); }`;
		t.assert.deepStrictEqual(getVerdicts(code), [false, false], type);
	}

	const code = [
		'/** @param {bigint} [value] */ function optional(value) { check(-value); check(~value); }',
		'/** @type {unknown} */ const value = 1n; check(-value); check(~value);',
		'/** @param {bigint} value */ function other(value) { check(+value); check(!value); check(typeof value); }',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [false, false, false, false, false, false, false]);
});

test('unary bigint inference preserves native annotation precedence', t => {
	const code = [
		'/** @param {bigint} value */ function native(value: number) { check(-value); check(~value); }',
		'/** @param {number} value */ function overridden(value: bigint) { check(-value); check(~value); }',
		'/** @param {bigint} value */ function asserted(value) { check(-(value as number)); check(~(value as number)); }',
	].join('\n');
	for (const typeAware of [false, true]) {
		t.assert.deepStrictEqual(getVerdicts(code, {typeAware}), [false, false, true, true, false, false]);
	}
});

test('unary bigint inference terminates on cyclic initializers', t => {
	t.assert.deepStrictEqual(getVerdicts('const value = -value; check(value);'), [false]);
	t.assert.deepStrictEqual(getVerdicts('const first = ~second; const second = -first; check(first); check(second);'), [false, false]);
});

test('conservative bigint checks recognize mixed JSDoc unions without changing definite checks', t => {
	for (const type of ['bigint | number', 'bigint | unknown', '?bigint', 'bigint | undefined']) {
		const code = `/** @param {${type}} value */ function run(value) { const alias = -value; check(value); check(alias); check(~value); }`;
		t.assert.deepStrictEqual(getVerdicts(code), [false, false, false], type);
		t.assert.deepStrictEqual(getVerdicts(code, {overrides: {treatMixedUnionAsTarget: true}}), [true, true, true], type);
	}

	const code = '/** @param {bigint} [value] */ function run(value) { check(value); check(-value); }';
	t.assert.deepStrictEqual(getVerdicts(code), [false, false]);
	t.assert.deepStrictEqual(getVerdicts(code, {overrides: {treatMixedUnionAsTarget: true}}), [true, true]);
});

test('conservative bigint checks preserve native annotation precedence', t => {
	const code = [
		'/** @param {bigint} value */ function numeric(value: number) { check(value); check(-value); }',
		'/** @param {number} value */ function mixed(value: bigint | number) { check(value); check(-value); }',
		'function optional(value?: bigint) { check(value); }',
	].join('\n');
	for (const typeAware of [false, true]) {
		t.assert.deepStrictEqual(getVerdicts(code, {typeAware}), [false, false, false, false, false]);
		t.assert.deepStrictEqual(getVerdicts(code, {typeAware, overrides: {treatMixedUnionAsTarget: true}}), [false, false, true, true, true]);
	}
});

test('conservative bigint checks do not confuse containers or function results with bigint bindings', t => {
	for (const type of ['number', 'unknown', 'Array<bigint>', '() => bigint', '{value: bigint}']) {
		const code = `/** @param {${type}} value */ function run(value) { check(value); check(-value); }`;
		t.assert.deepStrictEqual(getVerdicts(code, {overrides: {treatMixedUnionAsTarget: true}}), [false, false], type);
	}

	t.assert.deepStrictEqual(getVerdicts('const first = ~second; const second = -first; check(first); check(second);', {overrides: {treatMixedUnionAsTarget: true}}), [false, false]);
});

for (const operator of ['+', '-', '*', '/', '%', '**', '<<', '>>', '|', '^', '&']) {
	test(`binary ${operator} retains definite bigint operands through aliases`, t => {
		const code = [
			'/** @param {bigint} left\n * @param {bigint} right */ function run(left, right) {',
			`const result = left ${operator} right; const alias = result; check(alias); check(-(left ${operator} 1n));`,
			'}',
		].join('\n');
		t.assert.deepStrictEqual(getVerdicts(code), [true, true]);
	});
}

test('binary bigint inference requires definite operands on both sides', t => {
	for (const type of ['unknown', 'number', 'string', 'bigint | number', '?bigint']) {
		const code = [
			`/** @param {bigint} value\n * @param {${type}} other */ function run(value, other) {`,
			'check(value + other); check(other + value); check(value * other); check(other << value);',
			'}',
		].join('\n');
		t.assert.deepStrictEqual(getVerdicts(code), [false, false, false, false], type);
	}

	const code = '/** @param {bigint} value */ function run(value) { check(value >>> value); check(value < value); check(value === value); }';
	t.assert.deepStrictEqual(getVerdicts(code), [false, false, false]);
});

test('update expressions retain bigint types for prefix and postfix operators', t => {
	const code = '/** @param {bigint} value */ function run(value) { check(value++); check(++value); check(value--); check(--value); }';
	t.assert.deepStrictEqual(getVerdicts(code), [true, true, true, true]);
	for (const type of ['unknown', 'number', 'bigint | number', '?bigint']) {
		t.assert.deepStrictEqual(getVerdicts(`/** @param {${type}} value */ function run(value) { check(value++); check(--value); }`), [false, false], type);
	}
});

test('arithmetic and updates preserve native annotation precedence in both parser tiers', t => {
	const code = [
		'/** @param {bigint} value */ function numeric(value: number) { check(value * value); check(value++); }',
		'/** @param {number} value */ function integer(value: bigint) { check(value + value); check(--value); }',
		'/** @param {bigint} value */ function asserted(value) { check((value as number) + (value as number)); }',
	].join('\n');
	for (const typeAware of [false, true]) {
		t.assert.deepStrictEqual(getVerdicts(code, {typeAware}), [false, false, true, true, false]);
	}
});

test('arithmetic inference uses documented returns without bypassing uncertainty or cycles', t => {
	const code = [
		'/** @returns {bigint} */ function read() { return source; } check(read() + 1n);',
		'/** @type {unknown} */ const unknown = 1n; check(unknown * 1n);',
		'const first = second + 1n; const second = first * 2n; check(first); check(second);',
		'const result = result++; check(result);',
	].join('\n');
	t.assert.deepStrictEqual(getVerdicts(code), [true, false, false, false, false]);
});

test('arithmetic and updates propagate conservative union checks without weakening default inference', t => {
	const code = '/** @param {number | bigint} value */ function run(value) { check(value + 1n); check(value * value); check(value++); }';
	t.assert.deepStrictEqual(getVerdicts(code), [false, false, false]);
	t.assert.deepStrictEqual(getVerdicts(code, {overrides: {treatMixedUnionAsTarget: true}}), [true, true, true]);
});
