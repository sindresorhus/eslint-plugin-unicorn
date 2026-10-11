import test from 'node:test';
import vm from 'node:vm';
import {Linter} from 'eslint';
import plugin from '../../index.js';

function evaluate(code, values, limit) {
	const calls = [];
	const output = vm.runInNewContext(code, {
		values,
		getValue(value) {
			calls.push('value');
			return value;
		},
		getLimit() {
			calls.push('limit');
			return limit;
		},
	});
	return {output, calls};
}

for (const rule of ['prefer-early-return', 'prefer-continue']) {
	const exitKeyword = rule === 'prefer-early-return' ? 'return' : 'continue';
	for (const operator of ['<', '<=', '>', '>=']) {
		test(`${rule}: ${operator} suggestion changes unordered comparisons while autofix preserves them`, t => {
			const body = `if (getValue(value) ${operator} getLimit()) { result.push(value); result.push('matched'); }`;
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
			const expected = evaluate(code, numbers, 5);
			t.assert.deepStrictEqual(expected.calls, ['value', 'limit', 'value', 'limit', 'value', 'limit']);
			t.assert.deepStrictEqual(evaluate(fixed.output, numbers, 5), expected);
			t.assert.deepStrictEqual(evaluate(suggested, numbers, 5), expected);

			for (const value of [NaN, undefined, 'invalid']) {
				for (const [values, limit] of [[[...numbers, value], 5], [numbers, value]]) {
					const expected = evaluate(code, values, limit);
					t.assert.deepStrictEqual(evaluate(fixed.output, values, limit), expected);
					const alternative = evaluate(suggested, values, limit);
					t.assert.deepStrictEqual(alternative.calls, expected.calls);
					t.assert.notStrictEqual(alternative.output, expected.output);
				}
			}
		});
	}
}
