import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta, 'no-useless-coercion');

const linter = new Linter();

test({
	valid: [
		...['unknown', '?RegExp', 'RegExp | {source: number}', '{source: number}'].map(type =>
			`/** @param {${type}} pattern */ function run(pattern) { return String(pattern.source); }`,
		),
		'/** @param {RegExp} [pattern] */ function run(pattern) { return String(pattern.flags); }',
		'/** @param {RegExp} pattern */ function run(pattern) { return String(pattern?.source); }',
		'/** @param {RegExp} pattern */ function run(pattern) { return String(pattern["flags"]); }',
		'/** @param {{flags: boolean}} pattern */ function run(pattern) { return String(pattern.flags); }',
		'class Pattern extends RegExp { get source() { return 1; } } const pattern = new Pattern("x"); String(pattern.source);',
	],
	invalid: [
		['String(pattern.source)', 'pattern.source'],
		['String(pattern.flags)', 'pattern.flags'],
		['Number(pattern.source.trim().length)', 'pattern.source.trim().length'],
		['Boolean(pattern.flags.includes("i"))', 'pattern.flags.includes("i")'],
	].map(([expression, replacement]) => ({
		code: `/** @param {RegExp} pattern */ function run(pattern) { return ${expression}; }`,
		output: `/** @param {RegExp} pattern */ function run(pattern) { return ${replacement}; }`,
		errors: [{messageId: 'no-useless-coercion'}],
	})),
});

test({
	valid: [],
	invalid: [
		[
			'/** @returns {RegExp} */ function read() { return source; } const pattern = read(); const text = pattern.source; String(text);',
			'/** @returns {RegExp} */ function read() { return source; } const pattern = read(); const text = pattern.source; text;',
		],
		[
			'/** @param {() => RegExp} read */ function run(read) { return String(read().flags.trim()); }',
			'/** @param {() => RegExp} read */ function run(read) { return read().flags.trim(); }',
		],
	].map(([code, output]) => ({code, output, errors: [{messageId: 'no-useless-coercion'}]})),
});

for (const languageOptions of [
	{parser: parsers.typescript},
	{parser: typescriptEslintParser, parserOptions: {projectService: {allowDefaultProject: ['*.ts']}}},
]) {
	test({
		testerOptions: {languageOptions},
		valid: [{
			filename: 'file.ts',
			code: '/** @param {RegExp} pattern */ function run(pattern: {source: number}) { return String(pattern.source); }',
		}],
		invalid: [{
			filename: 'file.ts',
			code: 'function run(pattern: RegExp) { return [String(pattern.source), String(pattern.flags)]; }',
			output: 'function run(pattern: RegExp) { return [pattern.source, pattern.flags]; }',
			errors: [{messageId: 'no-useless-coercion'}, {messageId: 'no-useless-coercion'}],
		}],
	});
}

nodeTest('RegExp property coercion removal retains escaped source and canonical flags', t => {
	const config = {
		plugins: {unicorn: {rules: {'no-useless-coercion': rule}}},
		rules: {'unicorn/no-useless-coercion': 'error'},
	};
	for (const [source, flags, expected] of [
		['', '', ['(?:)', '']],
		['a/b\n', 'mig', [String.raw`a\/b\n`, 'gim']],
	]) {
		const prefix = '/** @param {RegExp} pattern */ function run(pattern) { return ';
		const suffix = `; } JSON.stringify(run(new RegExp(${JSON.stringify(source)}, ${JSON.stringify(flags)})));`;
		const code = `${prefix}[String(pattern.source), String(pattern.flags)]${suffix}`;
		const {output, fixed, messages} = linter.verifyAndFix(code, config);
		t.assert.strictEqual(output, `${prefix}[pattern.source, pattern.flags]${suffix}`);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(code), JSON.stringify(expected));
		t.assert.strictEqual(runInNewContext(output), JSON.stringify(expected));
		t.assert.strictEqual(linter.verifyAndFix(output, config).fixed, false);
	}
});
