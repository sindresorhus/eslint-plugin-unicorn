import test from 'node:test';
import {Linter} from 'eslint';
import plugin from '../../index.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

const linter = new Linter();

const lint = code => linter.verifyAndFix(code, {
	files: ['**/*.ts'],
	languageOptions: {
		parser: typescriptEslintParser,
		parserOptions: {projectService: {allowDefaultProject: ['*.ts']}},
	},
	plugins: {unicorn: plugin},
	rules: {'unicorn/prefer-includes': 'error'},
}, 'file.ts');

test('fixes a boolean predicate that returns the element', t => {
	for (const callback of [
		'value => value',
		'value => Boolean(value)',
		'function (value) { return value; }',
		'function value(value) { return value; }',
	]) {
		const result = lint(`declare const values: boolean[]; values.some(${callback});`);
		t.assert.strictEqual(result.output, 'declare const values: boolean[]; values.includes(true);', callback);
	}
});

test('ignores boolean predicates that are not a single returned element', t => {
	for (const callback of [
		'Boolean',
		'(value, index) => value',
		'({value}) => value',
		'value => { check(value); return value; }',
		'value => { return; }',
		'async value => value',
	]) {
		const code = `declare const values: boolean[]; values.some(${callback});`;
		const result = lint(code);
		t.assert.strictEqual(result.output, code, callback);
		t.assert.deepStrictEqual(result.messages, [], callback);
	}
});
