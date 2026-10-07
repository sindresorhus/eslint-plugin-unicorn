import test from 'node:test';
import vm from 'node:vm';
import outdent from 'outdent';
import {Linter} from 'eslint';
import unicorn from '../index.js';

for (const {name, setup, first, second, inspect, expected} of [
	{
		name: 'member assignment',
		setup: 'const object = {}; let key = "before"; function condition() { key = "after"; return selected; }',
		first: 'object[key] = 1',
		second: 'object[key] = 2',
		inspect: 'JSON.stringify(object)',
		expected: selected => JSON.stringify({after: selected ? 1 : 2}),
	},
	{
		name: 'compound assignment',
		setup: 'let value = 0; function condition() { value = 1; return selected; }',
		first: 'value += 2',
		second: 'value += 3',
		inspect: 'value',
		expected: selected => selected ? 3 : 4,
	},
	{
		name: 'logical assignment',
		setup: 'let calls = 0, value = 1; function condition() { calls++; return selected; }',
		first: 'value ||= 2',
		second: 'value ||= 3',
		inspect: 'JSON.stringify([value, calls])',
		expected: () => '[1,1]',
	},
]) {
	for (const prefix of ['', 'return ', 'result = ']) {
		test(`preserves ${name} evaluation order in ${prefix || 'standalone assignments'}`, t => {
			const code = outdent`
				${setup}
				let result;
				function run() {
					if (condition()) {
						${prefix}(${first});
					} else {
						${prefix}(${second});
					}
				}
				run();
				${inspect};
			`;
			const linter = new Linter();
			const fixed = linter.verifyAndFix(code, {
				plugins: {unicorn},
				rules: {'unicorn/prefer-ternary': 'error'},
			});
			t.assert.deepStrictEqual(fixed.messages, []);

			for (const selected of [true, false]) {
				for (const source of [code, fixed.output]) {
					t.assert.strictEqual(vm.runInNewContext(source, {selected}), expected(selected));
				}
			}

			t.assert.strictEqual(fixed.fixed, Boolean(prefix));
			if (!prefix) {
				t.assert.strictEqual(fixed.output, code);
			}
		});
	}
}
