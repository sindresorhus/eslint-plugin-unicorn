import test from 'node:test';
import vm from 'node:vm';
import {Linter} from 'eslint';
import plugin from '../../index.js';

for (const rule of ['prefer-early-return', 'prefer-continue']) {
	const exitKeyword = rule === 'prefer-early-return' ? 'return' : 'continue';
	for (const operator of ['<', '<=', '>', '>=']) {
		test(`${rule}: ${operator} suggestion changes unordered comparisons while autofix preserves them`, t => {
			const body = `if (value ${operator} 5) { result.push(value); result.push('matched'); }`;
			const code = rule === 'prefer-early-return'
				? `const result = []; function record(value) { ${body} } for (const value of values) { record(value); } JSON.stringify(result);`
				: `const result = []; for (const value of values) { ${body} } JSON.stringify(result);`;
			const linter = new Linter();
			const config = {plugins: {unicorn: plugin}, rules: {[`unicorn/${rule}`]: 'error', 'unicorn/no-negated-comparison': 'error'}};
			const messages = linter.verify(code, config);
			t.assert.strictEqual(messages.length, 1);
			const suggestion = messages[0].suggestions?.[0];
			t.assert.ok(suggestion);
			t.assert.strictEqual(suggestion.messageId, `${rule}/opposite-comparison`);
			t.assert.strictEqual(suggestion.desc, `Rewrite to an early ${exitKeyword} using the opposite comparison (changes behavior for NaN and values coerced to NaN).`);
			const {fix} = suggestion;
			const suggested = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
			const fixed = linter.verifyAndFix(code, config);
			t.assert.strictEqual(fixed.fixed, true);
			t.assert.deepStrictEqual(fixed.messages, []);
			t.assert.deepStrictEqual(linter.verify(suggested, config), []);

			const numbers = [2, 5, 10];
			const expected = vm.runInNewContext(code, {values: numbers});
			t.assert.strictEqual(vm.runInNewContext(fixed.output, {values: numbers}), expected);
			t.assert.strictEqual(vm.runInNewContext(suggested, {values: numbers}), expected);

			for (const value of [NaN, undefined, 'invalid']) {
				const values = [...numbers, value];
				const expected = vm.runInNewContext(code, {values});
				t.assert.strictEqual(vm.runInNewContext(fixed.output, {values}), expected);
				t.assert.notStrictEqual(vm.runInNewContext(suggested, {values}), expected);
			}
		});
	}
}
