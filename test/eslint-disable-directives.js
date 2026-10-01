import test from 'ava';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {testDisableDirectives} from './utils/test-disable-directives.js';

const cases = [
	['consistent-arrow-return-style', 'const f = () => { @ return value; };'],
	['no-useless-boolean-cast', 'array.some(value => Boolean(@ value.active));'],
	['no-negated-array-predicate', '!@ array.some(value => test(value));'],
	['no-negated-array-predicate', '!array.some(value => test(@ value));'],
	['no-magic-array-flat-depth', 'array.flat(@ 2);'],
	['no-blob-to-file', 'const blob = new Blob(); @ const file = new File([blob], "x"); URL.createObjectURL(file);'],
	['default-export-style', 'function f() {} @ export default f;'],
	// eslint-disable-next-line no-template-curly-in-string
	['operator-assignment', 'foo = @ `${foo} bar`;'],
	['no-incorrect-query-selector', 'document.querySelectorAll("form") @ [0];'],
	['prefer-error-is-error', 'value @ instanceof Error;'],
	['prefer-combined-guards', 'function f() { if (a) { return; } if (b) { @ return; } }'],
	['prefer-block-statement-over-iife', '(() => { foo(); }) @ ();'],
	['prefer-array-flat-map', 'array.filter(x => x).flatMap(x => [@ x, x]);'],
	['prefer-logical-operator-over-ternary', 'x == null @ ? fallback : x;'],
	['prefer-has-check', 'new URLSearchParams().get(@ key) !== null;'],
	['prefer-has-check', 'if (new Map().get(@ key)) {}'],
	['prefer-array-from-map', 'const result = []; for (const item of items) { @ result.push(transform(item)); }'],
	['prefer-array-from-async', 'const result = []; for await (const item of items) { @ result.push(item); }'],
	['prefer-iterable-in-constructor', 'const set = new Set(); for (const item of items) { @ set.add(item); }'],
	['prefer-iterable-in-constructor', 'new URLSearchParams(Object.entries(@ record));'],
	['prefer-map-from-entries', 'const object = Object @ .fromEntries(Object.entries(source)); object.foo;'],
	['prefer-map-from-entries', 'const object = Object.fromEntries(Object.entries(source)); object @ .foo;'],
	['prefer-abort-signal-timeout', 'const controller = new @ AbortController(); setTimeout(() => controller.abort(), 100); fetch(url, {signal: controller.signal});'],
	[
		'prefer-abort-signal-any',
		[
			'const controller = new @ AbortController();',
			'firstSignal.addEventListener("abort", () => controller.abort());',
			'secondSignal.addEventListener("abort", () => controller.abort());',
			'fetch(url, {signal: controller.signal});',
		].join(' '),
	],
	['prefer-object-destructuring-defaults', 'const {foo} = {@ foo: false, ...options};'],
	['prefer-single-object-destructuring', 'const source = {}; const {a} = source; @ const {b} = source;'],
	['prefer-single-array-predicate', 'array.some(x => x.a) || @ array.some(x => x.b);'],
	['prefer-set-methods', 'const a = new Set(); const b = new Set(); new Set(@ [...a, ...b]);'],
	['prefer-set-methods', 'const a = new Set(); const b = new Set(); [...a].filter(@ x => b.has(x));'],
	['prefer-set-methods', 'const a = new Set(); const b = new Set(); [...a].every(@ x => b.has(x));'],
	['prefer-short-arrow-method', 'const object = { method() { @ return 1; } };', ['consistent-as-needed']],
	['prefer-string-match-all', 'const string = "foo"; const regexp = /o/g; let match; @ while ((match = regexp.exec(string)) !== null) {}'],
	['prefer-string-replace-all', 'foo.split("a").join(@ "b");'],
	['prefer-url-can-parse', 'function valid(input) { try { @ new URL(input); return true; } catch { return false; } }'],
	['prefer-url-can-parse', 'let valid; try { @ new URL(input); valid = true; } catch { valid = false; }'],
	['prefer-url-search-parameters', 'query.split("&").map(@ part => part.split("="));'],
	['prefer-while-loop-condition', 'while (true) { @ if (done) { break; } work(); }'],
];

for (const [ruleName, template, options] of cases) {
	testDisableDirectives(ruleName, template, {options});
}

test('no-empty-file does not count disable directives as allowed comments', t => {
	const linter = new Linter();
	const ruleId = 'unicorn/no-empty-file';
	const config = {
		plugins: {unicorn},
		rules: {[ruleId]: ['error', {allowComments: true}]},
		linterOptions: {reportUnusedDisableDirectives: 'error'},
	};
	const baselineMessages = linter.verify('', config);
	t.is(baselineMessages.length, 1);
	t.is(baselineMessages[0].ruleId, ruleId);
	const code = `/* eslint-disable ${ruleId} -- Generated file. */`;
	t.deepEqual(linter.verify(code, config), []);
	t.is(linter.getSuppressedMessages().length, 1);
	for (const allowComments of [true, false]) {
		t.deepEqual(linter.verify(`\n\n  ${code}`, {...config, rules: {[ruleId]: ['error', {allowComments}]}}), []);
		t.is(linter.getSuppressedMessages().length, 1);
	}

	t.deepEqual(linter.verify('/* Explanation. */', config), []);
	t.deepEqual(linter.verify(`${code}\n/* Explanation. */`, {...config, linterOptions: {reportUnusedDisableDirectives: 'off'}}), []);
	const unrelatedMessages = linter.verify('/* eslint-disable no-alert */', {...config, linterOptions: {reportUnusedDisableDirectives: 'off'}});
	t.is(unrelatedMessages.length, 1);
	t.is(unrelatedMessages[0].ruleId, ruleId);
});
