import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['array.toReversed().find(/* keep */ value => value)', 'array.findLast(/* keep */ value => value)'],
		['([1, /* keep */ 2]).toReversed().find(value => value)', '([1, /* keep */ 2]).findLast(value => value)'],
		['((/* keep */ array)).reverse().find(value => value)', '((/* keep */ array)).findLast(value => value)'],
		['array.toReversed().find(// keep\nvalue => value)', 'array.findLast(// keep\nvalue => value)'],
		['array.toReversed().find(// keep\r\nvalue => value)', 'array.findLast(// keep\r\nvalue => value)'],
	].map(([code, output]) => ({
		code,
		errors: [{
			messageId: 'prefer-array-last-methods',
			suggestions: [{messageId: 'replace', output}],
		}],
	})),
});

test({
	valid: [],
	invalid: [
		...[
			'array /* keep */ .toReversed().find(value => value)',
			'array.toReversed /* keep */ ().find(value => value)',
		].map(code => ({code, errors: [{messageId: 'prefer-array-last-methods', suggestions: []}]})),
		{
			code: '(array as /* keep */ number[]).toReversed().find(value => value)',
			languageOptions: {parser: parsers.typescript},
			errors: [{
				messageId: 'prefer-array-last-methods',
				suggestions: [{messageId: 'replace', output: '(array as /* keep */ number[]).findLast(value => value)'}],
			}],
		},
	],
});

nodeTest('last-method suggestions preserve comments and callback evaluation while allowing mutation changes', t => {
	const linter = new Linter();
	for (const [method, expectedArray] of [['reverse', [3, 2, 1]], ['toReversed', [1, 2, 3]]]) {
		const code = `
			const array = [1, 2, 3];
			const seen = [];
			const result = (/* keep */ array).${method}().find(/* predicate */ value => {
				seen.push(value);
				return value === 2;
			});
			JSON.stringify({array, seen, result});
		`;
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			plugins: {unicorn: {rules: {'prefer-array-last-methods': rule}}},
			rules: {'unicorn/prefer-array-last-methods': 'error'},
		});

		t.assert.strictEqual(fixed, false);
		t.assert.strictEqual(output, code);
		t.assert.strictEqual(messages.length, 1);
		t.assert.strictEqual(messages[0].fix, undefined);
		t.assert.strictEqual(messages[0].suggestions.length, 1);
		const {range, text} = messages[0].suggestions[0].fix;
		const suggested = code.slice(0, range[0]) + text + code.slice(range[1]);
		t.assert.ok(suggested.includes('/* keep */'));
		t.assert.ok(suggested.includes('/* predicate */'));
		t.assert.strictEqual(runInNewContext(code), JSON.stringify({array: expectedArray, seen: [3, 2], result: 2}));
		t.assert.strictEqual(runInNewContext(suggested), JSON.stringify({array: [1, 2, 3], seen: [3, 2], result: 2}));
	}
});

test.snapshot({
	valid: [
		'array.findLast(logic);',
		'array.findLastIndex(logic);',
		'array.lastIndexOf(logic);',
		'array.reduceRight(logic);',
		'array.reverse();',
		'array.toReversed();',
		'array.reverse(logic).find(logic);',
		'array.toReversed(logic).find(logic);',
		'array.reverse?.().find(logic);',
		'array.toReversed?.().find(logic);',
		'array?.reverse().find(logic);',
		'array?.toReversed().find(logic);',
		'array[reverse]().find(logic);',
		'array.reverse()[find](logic);',
		'array.reverse().map(logic);',
		'array.toReversed().map(logic);',
		'const reversed = array.reverse(); reversed.find(logic);',
		'array.reverse().find;',
		'array.toReversed().find;',
	],
	invalid: [
		'array.reverse().find(logic);',
		'array.reverse().findIndex(logic);',
		'array.reverse().indexOf(logic);',
		'array.reverse().reduce(logic);',
		'array.toReversed().find(logic);',
		'array.toReversed().findIndex(logic);',
		'array.toReversed().indexOf(logic);',
		'array.toReversed().reduce(logic);',
		'array.reverse().find(logic, thisArgument);',
		'array.toReversed().findIndex(logic, thisArgument);',
		'array.reverse().reduce(logic, initialValue);',
		'array.toReversed().reduce(logic, initialValue);',
		'(array.reverse()).find(logic);',
		'(array.toReversed()).find(logic);',
		'array.reverse(/* comment */).find(logic);',
		'array.toReversed() /* comment */ .reduce(logic);',
	],
});
