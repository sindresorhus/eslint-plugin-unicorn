import {test as nodeTest} from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test, rule} = getTester(import.meta);

test({
	valid: [],
	invalid: [
		['parseInt(getValue(/* keep */), 10);', 'Math.trunc(Number(getValue(/* keep */)));'],
		['Number.parseInt((/* keep */ value), 10);', 'Math.trunc(Number((/* keep */ value)));'],
		['parseInt(values[/* keep */ index], 10);', 'Math.trunc(Number(values[/* keep */ index]));'],
		['parseInt((prepare(/* keep */), value), 10);', 'Math.trunc(Number((prepare(/* keep */), value)));'],
		['parseInt(getValue(\r\n  // keep\r\n), 10);', 'Math.trunc(Number(getValue(\r\n  // keep\r\n)));'],
	].map(([code, output]) => ({code, errors: [{messageId: 'parse-int', suggestions: [{messageId: 'suggestion-trunc', output}]}]})),
});

test({
	valid: [],
	invalid: [
		{
			code: 'parseInt((value as /* keep */ string), 10);',
			languageOptions: {parser: parsers.typescript},
			errors: [{messageId: 'parse-int', suggestions: [{messageId: 'suggestion-trunc', output: 'Math.trunc(Number(value as /* keep */ string));'}]}],
		},
		...[
			'Number./* keep */parseInt(value, 10);',
			'parseInt(value /* keep */, 10);',
			'parseInt(value, 1 /* keep */ * 10);',
			'parseInt?.(getValue(/* keep */), 10);',
		].map(code => ({code, errors: [{messageId: 'parse-int', suggestions: []}]})),
	],
});

nodeTest('commented parseInt inputs are evaluated once and conversion changes remain suggestions', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: {rules: {'prefer-number-coercion': rule}}},
		rules: {'unicorn/prefer-number-coercion': 'error'},
	};
	const code = 'let evaluations = 0; function getValue() { evaluations++; return input; } const result = parseInt(getValue(/* keep */), 10); JSON.stringify({evaluations, result});';
	const {output, fixed, messages} = linter.verifyAndFix(code, config);
	t.assert.strictEqual(output, code);
	t.assert.strictEqual(fixed, false);
	t.assert.strictEqual(messages.length, 1);
	t.assert.strictEqual(messages[0].fix, undefined);
	t.assert.strictEqual(messages[0].suggestions.length, 1);
	const {fix} = messages[0].suggestions[0];
	const corrected = code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
	t.assert.ok(corrected.includes('/* keep */'));
	for (const [input, original, suggested] of [['123.45', 123, 123], ['1e3', 1, 1000]]) {
		t.assert.strictEqual(runInNewContext(code, {input}), JSON.stringify({evaluations: 1, result: original}));
		t.assert.strictEqual(runInNewContext(corrected, {input}), JSON.stringify({evaluations: 1, result: suggested}));
	}
});

test.snapshot({
	valid: [
		'Number(value);',
		'Math.trunc(Number(value));',
		'parseFloat();',
		'parseInt(value);',
		'parseInt(value, 2);',
		'Number.parseInt(value, 8);',
		'parseInt(value, radix);',
		'const alias = condition; var condition = true; parseInt(value, alias ? 10 : radix);',
		'const modes = new Set([\'foo\']); modes.clear(); parseInt(value, modes.size ? 10 : 2);',
		'const modes = new Set([\'foo\']); modes.clear(); parseInt(value, +(modes.size ? 10 : 2));',
		{
			code: 'const modes = new Set([\'foo\']); modes.clear(); parseInt(value, (modes.size ? 10 : 2) as number);',
			languageOptions: {parser: parsers.typescript},
		},
		'const modes = new Set([\'foo\']); modes.clear(); parseInt(value, modes.size && 10);',
		'const modes = new Set([\'foo\']); modes.clear(); parseInt(value, (modes.size = 0) ? 10 : radix);',
		'const object = {value: true}; Object.defineProperty(object, \'value\', {get() { return false; }}); parseInt(value, object.value ? 10 : radix);',
		'Number.parseInt(value, radix);',
		'Number["parseFloat"](value);',
		'Number["parseInt"](value, 10);',
		'object.parseFloat(value);',
		'object.parseInt(value, 10);',
		outdent`
			const parseFloat = value => value;
			parseFloat(value);
		`,
		outdent`
			const parseInt = value => value;
			parseInt(value, 10);
		`,
		outdent`
			function parseFloat() {}
			function inner() {
				return parseFloat(value);
			}
		`,
		outdent`
			function parseInt() {}
			function inner() {
				return parseInt(value, 10);
			}
		`,
	],
	invalid: [
		'parseFloat(value);',
		'Number.parseFloat(value);',
		'globalThis.parseFloat(value);',
		'parseFloat(value, extra);',
		'Number /* comment */ .parseFloat(value);',
		'parseFloat(...argumentsArray);',
		'parseFloat(...firstArguments, ...secondArguments);',
		outdent`
			const {parseFloat} = Number;
			parseFloat(value);
		`,
		'parseInt(value, 10);',
		'Number.parseInt(value, 10);',
		'globalThis.parseInt(value, 10);',
		// Optional call: reported but no suggestion (replacement would be unsafe)
		'parseInt?.(value, 10);',
		'Number.parseInt?.(value, 10);',
		outdent`
			const {parseInt} = Number;
			parseInt(value, 10);
		`,
		'parseInt(value, 0xA);',
		'parseInt(value, 2 * 5);',
		outdent`
			const radix = 10;
			parseInt(value, radix);
		`,
		'parseInt(value, radix = 10);',
		'parseInt((foo, bar), 10);',
		'parseInt(value, 10, extra);',
		'parseInt(/* comment */ value, 10);',
		'parseInt(value, /* comment */ 10);',
	],
});
