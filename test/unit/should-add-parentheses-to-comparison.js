import test from 'node:test';
import {Linter} from 'eslint';
import {typescriptEslintParser} from '../../scripts/parsers.js';
import {shouldAddParenthesesToComparison} from '../../rules/utils/index.js';

test('groups comparisons only when the surrounding expression would capture them', t => {
	const linter = new Linter();
	for (const [code, operator, expected] of [
		['marker() | mask', '===', false],
		['marker() === value', '===', false],
		['value === marker()', '===', true],
		['marker() > value', '===', true],
		['marker() > value', '>', false],
		['value > marker()', '>', true],
		['marker() satisfies boolean', '>', false],
		['marker() satisfies boolean', '===', true],
		['marker() as boolean', '>', false],
		['marker() as boolean', '===', true],
		['marker().value', '===', true],
		['object[marker()]', '===', false],
		['marker()()', '===', true],
		['marker()`template`', '===', true],
		['!marker()', '===', true],
		['marker()!', '===', true],
		['<boolean>marker()', '===', true],
		['value === (marker())', '===', false],
		['marker() && value', '===', false],
	]) {
		let actual;
		const messages = linter.verify(code, {
			languageOptions: {parser: typescriptEslintParser},
			plugins: {
				test: {
					rules: {
						inspect: {
							create: context => ({
								'CallExpression[callee.name="marker"]'(node) {
									actual = shouldAddParenthesesToComparison(node, context, operator);
								},
							}),
						},
					},
				},
			},
			rules: {'test/inspect': 'error'},
		});
		t.assert.deepStrictEqual(messages, []);
		t.assert.strictEqual(actual, expected, code);
	}
});
