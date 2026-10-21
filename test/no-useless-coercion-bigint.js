import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta, 'no-useless-coercion');

const linter = new Linter();

test({
	valid: [
		...[
			['bigint', 'string', 'left + right'],
			['bigint', 'unknown', 'left + right'],
			['bigint', 'number | bigint', 'left + right'],
			['bigint', 'unknown', 'left * right'],
			['unknown', 'bigint', 'left - right'],
			['?bigint', 'bigint', 'left | right'],
		].map(([left, right, expression]) =>
			`/** @param {${left}} left\n * @param {${right}} right */ function run(left, right) { return BigInt(${expression}); }`,
		),
		'/** @param {unknown} value */ function run(value) { return BigInt(value++); }',
		'/** @param {bigint} [value] */ function run(value) { return BigInt(--value); }',
		'/** @param {bigint} value */ function run(value) { return BigInt(value >>> value); }',
	],
	invalid: [
		...['+', '-', '*', '/', '%', '**', '<<', '>>', '|', '^', '&'].map(operator => {
			const prefix = '/** @param {bigint} left\n * @param {bigint} right */ function run(left, right) { return ';
			return {
				code: `${prefix}BigInt(left ${operator} right); }`,
				output: `${prefix}(left ${operator} right); }`,
				errors: [{messageId: 'no-useless-coercion'}],
			};
		}),
		...['value++', '++value', 'value--', '--value'].map(expression => ({
			code: `/** @param {bigint} value */ function run(value) { return BigInt(${expression}); }`,
			output: `/** @param {bigint} value */ function run(value) { return (${expression}); }`,
			errors: [{messageId: 'no-useless-coercion'}],
		})),
	],
});

test({
	valid: [],
	invalid: [{
		code: '/** @returns {bigint} */ function read() { return source; } const total = read() + read(); const alias = total; BigInt(alias);',
		output: '/** @returns {bigint} */ function read() { return source; } const total = read() + read(); const alias = total; alias;',
		errors: [{messageId: 'no-useless-coercion'}],
	}],
});

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [{
			filename: 'file.ts',
			code: '/** @param {bigint} left */ function run(left: number, right: number) { return BigInt(left + right); }',
		}],
		invalid: [{
			filename: 'file.ts',
			code: 'function run(left: bigint, right: bigint) { return [BigInt((left * right) + right), BigInt(left++)]; }',
			output: 'function run(left: bigint, right: bigint) { return [((left * right) + right), (left++)]; }',
			errors: [{messageId: 'no-useless-coercion'}, {messageId: 'no-useless-coercion'}],
		}],
	});
}

nodeTest('bigint arithmetic fixes retain precision evaluation order updates and errors', t => {
	const config = {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};
	for (const [initial, expression, expected] of [
		['9007199254740993n', 'read(value) + read(2n)', ['bigint', '9007199254740995', '9007199254740993', ['9007199254740993', '2']]],
		['9007199254740993n', 'read(value) << read(2n)', ['bigint', '36028797018963972', '9007199254740993', ['9007199254740993', '2']]],
		['9007199254740993n', 'value++', ['bigint', '9007199254740993', '9007199254740994', []]],
		['9007199254740993n', '++value', ['bigint', '9007199254740994', '9007199254740994', []]],
		['0n', 'value--', ['bigint', '0', '-1', []]],
		['0n', '--value', ['bigint', '-1', '-1', []]],
		['5n', 'read(value) / read(0n)', ['string', 'RangeError', '5', ['5', '0']]],
		['5n', 'read(value) ** read(-1n)', ['string', 'RangeError', '5', ['5', '-1']]],
	]) {
		const reader = 'const events = []; /** @returns {bigint} */ function read(value) { events.push(String(value)); return value; } ';
		const prefix = `${reader}/** @param {bigint} value */ function run(value) { let result; try { result = `;
		const suffix = `; } catch (error) { result = error.name; } return JSON.stringify([typeof result, String(result), String(value), events]); } run(${initial});`;
		const code = `${prefix}BigInt(${expression})${suffix}`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, `${prefix}(${expression})${suffix}`);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(code), JSON.stringify(expected));
		t.assert.strictEqual(runInNewContext(output), JSON.stringify(expected));
		t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
	}
});

nodeTest('uncertain arithmetic and update values still need BigInt conversion', t => {
	const config = {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};
	for (const [code, expected] of [
		['/** @param {bigint} left\n * @param {unknown} right */ function run(left, right) { return BigInt(left + right); } run(1n, "2");', 12n],
		['/** @param {bigint | number} value */ function run(value) { return BigInt(value * value); } run(3);', 9n],
		['/** @param {unknown} value */ function run(value) { const result = BigInt(value++); return JSON.stringify([typeof result, String(result), value]); } run("2");', '["bigint","2",3]'],
	]) {
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(fixed, false);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(output), expected);
	}
});
