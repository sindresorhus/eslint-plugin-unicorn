import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {getTester} from './utils/test.js';
import createSimpleArraySearchRuleTestFixtures from './shared/simple-array-search-rule-tests.js';

const {test, rule} = getTester(import.meta);

const linterConfig = {
	plugins: {unicorn: {rules: {'prefer-array-index-of': rule}}},
	rules: {'unicorn/prefer-array-index-of': 'error'},
};

nodeTest('index searches with side effects stay suggestions', t => {
	for (const [method, replacement] of [['findIndex', 'indexOf'], ['findLastIndex', 'lastIndexOf']]) {
		for (const [code, original, suggested] of [
			[
				`let calls = 0; function getValue() { calls++; return calls + 1; } const index = [1, 2].${method}(item => item === getValue()); JSON.stringify({index, calls});`,
				method === 'findIndex' ? '{"index":-1,"calls":2}' : '{"index":1,"calls":1}',
				'{"index":1,"calls":1}',
			],
			[
				`let value = 1; const index = [].${method}(item => item === (value += 1)); JSON.stringify({index, value});`,
				'{"index":-1,"value":1}',
				'{"index":-1,"value":2}',
			],
		]) {
			const {output, fixed, messages} = new Linter().verifyAndFix(code, linterConfig);
			t.assert.strictEqual(output, code);
			t.assert.strictEqual(fixed, false);
			t.assert.strictEqual(runInNewContext(output), original);
			t.assert.strictEqual(messages.length, 1);
			t.assert.strictEqual(messages[0].fix, undefined);
			t.assert.strictEqual(messages[0].suggestions.length, 1);
			t.assert.strictEqual(messages[0].suggestions[0].messageId, `prefer-${replacement}-over-${method}/suggestion`);
			const {range, text} = messages[0].suggestions[0].fix;
			const suggestedCode = code.slice(0, range[0]) + text + code.slice(range[1]);
			t.assert.strictEqual(runInNewContext(suggestedCode), suggested);
		}
	}
});

nodeTest('index searches without side effects are autofixed', t => {
	for (const [method, replacement] of [['findIndex', 'indexOf'], ['findLastIndex', 'lastIndexOf']]) {
		for (const value of [
			'0',
			'-0',
			'+2',
			'-(-2)',
			'1e999',
			'-1e999',
			'"item"',
			'true',
			'false',
			'null',
			'2n',
			'undefined',
			'`item`',
			'/item/u',
			'target',
			'object.id',
			'object?.id',
			'object.missing',
		]) {
			for (const values of ['[]', '[0, 2, "item", true, false, null, 2n, 1e999, undefined]']) {
				const setup = 'const target = 2; const object = {id: "item"};';
				const code = `${setup} ${values}.${method}(item => item === ${value});`;
				const {output, fixed, messages} = new Linter().verifyAndFix(code, linterConfig);
				t.assert.strictEqual(output, `${setup} ${values}.${replacement}(${value});`);
				t.assert.strictEqual(fixed, true);
				t.assert.deepStrictEqual(messages, []);
				t.assert.strictEqual(runInNewContext(output), runInNewContext(code));
			}
		}
	}
});

const indexOfOverFindIndexFixtures = createSimpleArraySearchRuleTestFixtures({
	method: 'findIndex',
	replacement: 'indexOf',
});

test.snapshot(indexOfOverFindIndexFixtures.snapshot);
test.typescript(indexOfOverFindIndexFixtures.typescript);

const lastIndexOfOverFindLastIndexFixtures = createSimpleArraySearchRuleTestFixtures({
	method: 'findLastIndex',
	replacement: 'lastIndexOf',
});

test.snapshot(lastIndexOfOverFindLastIndexFixtures.snapshot);
test.typescript(lastIndexOfOverFindLastIndexFixtures.typescript);

// Unlike `some()` and `includes()`, both sides use `===`, so a `NaN` search value finds nothing either way
test({
	valid: [],
	invalid: [
		{
			code: 'foo.findIndex(element => element === NaN);',
			output: 'foo.indexOf(NaN);',
			errors: 1,
		},
		{
			code: 'foo.findLastIndex(element => element === NaN);',
			output: 'foo.lastIndexOf(NaN);',
			errors: 1,
		},
	],
});
