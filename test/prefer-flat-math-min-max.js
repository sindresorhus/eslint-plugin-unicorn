import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {outdent} from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);
const linterConfig = {
	plugins: {unicorn: {rules: {'prefer-flat-math-min-max': rule}}},
	rules: {'unicorn/prefer-flat-math-min-max': 'error'},
};

nodeTest('numeric literal autofixes preserve signed zero, finite values, and infinities', t => {
	const linter = new Linter();
	for (const method of ['min', 'max']) {
		for (const left of ['0', '-0', '1', '-1', '+2', '1e999', '-1e999']) {
			for (const right of ['0', '-0', '1', '-1', '+2', '1e999', '-1e999']) {
				for (const code of [
					`Math.${method}(Math.${method}(${left}, ${right}), -0);`,
					`Math.${method}(-0, Math.${method}(${left}, ${right}));`,
				]) {
					const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
					t.assert.strictEqual(fixed, true, code);
					t.assert.deepStrictEqual(messages, []);
					t.assert.strictEqual(runInNewContext(output), runInNewContext(code), code);
				}
			}
		}

		const code = `Math.${method}(Math.${method}());`;
		const {output, fixed, messages} = linter.verifyAndFix(code, linterConfig);
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(runInNewContext(output), runInNewContext(code));
	}
});

test({
	valid: [],
	invalid: [
		{
			code: 'Math.max(Math.max(1, 2), Math.max(3, 4), 5);',
			output: 'Math.max(1, 2, 3, 4, 5);',
			errors: 1,
		},
		{
			code: 'Math.max(Math.max((1 as number), -0), +2);',
			languageOptions: {parser: parsers.typescript},
			output: 'Math.max((1 as number), -0, +2);',
			errors: 1,
		},
		{
			code: 'Math.min((<number>-1), Math.min(2 satisfies number, 3!));',
			languageOptions: {parser: parsers.typescript},
			output: 'Math.min((<number>-1), 2 satisfies number, 3!);',
			errors: 1,
		},
		{
			code: 'Math.min(Math.min((value as number), 0), 1);',
			languageOptions: {parser: parsers.typescript},
			output: 'Math.min((value as number), 0, 1);',
			errors: 1,
		},
		{
			code: 'Math.min(Math.min((getValue() as number), 0), 1);',
			languageOptions: {parser: parsers.typescript},
			output: 'Math.min((getValue() as number), 0, 1);',
			errors: 1,
		},
		// Coercion order of nested arguments is unsupported, so arguments with side effects are still autofixed
		{
			code: 'Math.max(Math.max(width, height), size++);',
			output: 'Math.max(width, height, size++);',
			errors: 1,
		},
		{
			code: 'Math.min(Math.min(/* keep */ 1, 2), 3);',
			errors: 1,
		},
	],
});

test.snapshot({
	valid: [
		'Math.max(a, b, c);',
		'Math.min(a, b, c);',
		'Math.max(Math.min(a, b), c);',
		'Math.min(Math.max(a, b), c);',
		'max(max(a, b), c);',
		'Math.max.apply(Math, [Math.max(a, b), c]);',
		'Math["max"](Math["max"](a, b), c);',
		'Math.max?.(Math.max(a, b), c);',
		'Math?.max(Math.max(a, b), c);',
		'Math.max(Math.max?.(a, b), c);',
		'Math.max(Math?.max(a, b), c);',
		'globalThis.Math.max(Math.max(a, b), c);',
		'Number.max(Number.max(a, b), c);',
		'Math.hypot(Math.hypot(a, b), c);',
	],
	invalid: [
		'Math.max(Math.max(a, b), c);',
		'Math.min(a, Math.min(b, c));',
		'Math.max(Math.max(a, b), Math.max(c, d), e);',
		'Math.min(Math.min(Math.min(a, b), c), d);',
		'Math.max(Math.max(a, b));',
		'Math.min(Math.min());',
		'Math.max(Math.max(...values), fallback);',
		'const value = Math.max(foo, Math.max(bar, baz)).toString();',
		'const value = Math.min((Math.min(a, b)), c);',
		outdent`
			const value = Math.max(
				Math.max(a, b),
				c,
			);
		`,
		outdent`
			const value = Math.max(
				Math.max(
					a,
					b,
				),
				c,
			);
		`,
		outdent`
			const value = Math.max(
				Math.max(/* keep */ a, b),
				c,
			);
		`,
		'Math.max(Math.max((a, b), c), d);',
		'Math.max(c, Math.max((a, b), d));',
		'Math.min(Math.min((a, b), c), d);',
		'Math.max(Math.max((a), ...(b)), c);',
	],
});
