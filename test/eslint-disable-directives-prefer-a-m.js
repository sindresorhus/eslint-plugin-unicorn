import test from 'node:test';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {typescriptEslintParser} from '../scripts/parsers.js';
import {testDisableDirectives} from './utils/test-disable-directives.js';

const timeout = 'const controller = new AbortController(); setTimeout(() => controller.abort(), 100); fetch(url, {signal: controller.signal});';
const any = [
	'const controller = new AbortController();',
	'firstSignal.addEventListener("abort", () => controller.abort());',
	'secondSignal.addEventListener("abort", () => controller.abort());',
	'fetch(url, {signal: controller.signal});',
].join(' ');
const anyLoop = [
	'const controller = new AbortController();',
	'for (const signal of [firstSignal, secondSignal]) { signal.addEventListener("abort", () => controller.abort()); }',
	'fetch(url, {signal: controller.signal});',
].join(' ');
const cases = [
	['prefer-abort-signal-timeout', timeout.replace('; setTimeout', '; @ setTimeout')],
	['prefer-abort-signal-timeout', timeout.replace('() => controller', '() => @ controller')],
	['prefer-abort-signal-timeout', timeout.replace('; fetch', '; @ fetch')],
	['prefer-abort-signal-timeout', timeout.replace('controller.signal', 'controller @ .signal')],
	['prefer-abort-signal-timeout', timeout.replace('const controller =', 'const controller: @ AbortController ='), true],
	['prefer-abort-signal-any', any.replace('; firstSignal', '; @ firstSignal')],
	['prefer-abort-signal-any', any.replace('; secondSignal', '; @ secondSignal')],
	['prefer-abort-signal-any', any.replace('() => controller', '() => @ controller')],
	['prefer-abort-signal-any', any.replace('; fetch', '; @ fetch')],
	['prefer-abort-signal-any', any.replace('controller.signal', 'controller @ .signal')],
	['prefer-abort-signal-any', any.replace('const controller =', 'const controller: @ AbortController ='), true],
	['prefer-abort-signal-any', anyLoop.replace('{ signal', '{ @ signal')],
	['prefer-abort-signal-any', anyLoop.replace('; for', '; @ for')],
	['prefer-map-from-entries', 'const object = Object.fromEntries(Object.entries(source)); Object.keys(@ object);'],
	['prefer-map-from-entries', 'const object = Object.fromEntries(Object.entries(source)); Object.hasOwn(@ object, "foo");'],
	['prefer-map-from-entries', 'const object = Object.fromEntries(Object.entries(source)); object.foo @ = value;'],
	['prefer-map-from-entries', 'const object = Object.fromEntries(Object.entries(source)); delete @ object.foo;'],
	['prefer-logical-operator-over-ternary', 'value == null @ ? undefined : value.foo;'],
	['prefer-array-from-async', 'const result = []; for (const item of [1]) { @ result.push(await transform(item)); }'],
	['prefer-error-is-error', 'Object.prototype.toString.call(value) @ === "[object Error]";'],
	['prefer-abort-signal-any', anyLoop.replace('} fetch', '} @ fetch')],
];

for (const [ruleName, template, typescript = false] of cases) {
	testDisableDirectives(ruleName, template, {
		...(typescript && {languageOptions: {parser: typescriptEslintParser}}),
	});
}

test('prefer-combined-guards honors directives before the first guard', t => {
	const ruleId = 'unicorn/prefer-combined-guards';
	const code = `function foo() { /* eslint-disable ${ruleId} */ if (a) { return; } if (b) { return; } /* eslint-enable ${ruleId} */ }`;
	const linter = new Linter();
	t.assert.deepStrictEqual(linter.verify(code, {
		plugins: {unicorn},
		rules: {[ruleId]: 'error'},
		linterOptions: {reportUnusedDisableDirectives: 'error'},
	}), []);
	const suppressed = linter.getSuppressedMessages();
	t.assert.strictEqual(suppressed.length, 1);
	t.assert.strictEqual(suppressed[0].fix, undefined);
});
