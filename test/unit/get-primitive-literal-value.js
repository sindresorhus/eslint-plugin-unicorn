/* eslint-disable no-template-curly-in-string */
import test from 'node:test';
import {parse} from 'espree';
import {getPrimitiveLiteralValue} from '../../rules/utils/index.js';
import {typescriptEslintParser} from '../../scripts/parsers.js';

test('reads primitive literals without evaluating other expressions', t => {
	for (const [code, expected] of [
		['""', ''],
		[String.raw`"\u0070x"`, 'px'],
		['`px`', 'px'],
		['false', false],
		['true', true],
		['null', null],
		['0', 0],
		['-0', -0],
		['+2', 2],
		['-2', -2],
		['0x10', 16],
		['1_000n', 1000n],
		['-1n', -1n],
		['undefined', undefined],
		['void 0', undefined],
		['value', undefined],
		['/x/', undefined],
		['({})', undefined],
		['[]', undefined],
		['1 + 1', undefined],
		['-value', undefined],
		['!true', undefined],
		['+1n', undefined],
		['`x${1}`', undefined],
	]) {
		const node = parse(code, {ecmaVersion: 'latest'}).body[0].expression;
		t.assert.strictEqual(getPrimitiveLiteralValue(node), expected, code);
	}

	t.assert.strictEqual(getPrimitiveLiteralValue(), undefined);
});

test('unwraps runtime-transparent TypeScript expressions', t => {
	for (const [code, expected] of [
		['true as boolean', true],
		['false satisfies boolean', false],
		['(null as unknown)!', null],
		['-1 as number', -1],
		['-(1 as number)', -1],
		['<number>0', 0],
		['value as boolean', undefined],
	]) {
		const node = typescriptEslintParser.parseForESLint(code).ast.body[0].expression;
		t.assert.strictEqual(getPrimitiveLiteralValue(node), expected, code);
	}
});
