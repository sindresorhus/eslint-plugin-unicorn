import test from 'ava';
import {Linter} from 'eslint';
import unicorn from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

const listener = (callback, options = '{passive: true}') => `element.addEventListener("wheel", ${callback}, ${options});`;

ruleTest({
	valid: [],
	invalid: [
		{
			code: listener('event => event.preventDefault()'),
			errors: [{
				message: '`preventDefault()` has no effect in a passive event listener.',
				suggestions: [{
					messageId: 'no-prevent-default-in-passive-listener/suggestion',
					output: listener('event => event.preventDefault()', '{passive: false}'),
				}],
			}],
		},
		{
			code: 'element.addEventListener("wheel", event => {\r\n  event.preventDefault();\r\n}, {\r\n  passive: (/* keep */ true) // keep\r\n});\r\n',
			errors: [{
				messageId: 'no-prevent-default-in-passive-listener/error',
				suggestions: [{
					messageId: 'no-prevent-default-in-passive-listener/suggestion',
					output: 'element.addEventListener("wheel", event => {\r\n  event.preventDefault();\r\n}, {\r\n  passive: (/* keep */ false) // keep\r\n});\r\n',
				}],
			}],
		},
	],
});

ruleTest.snapshot({
	valid: [
		'element.addEventListener("wheel", event => event.preventDefault());',
		'function handler(event) { event.preventDefault(); } element.addEventListener("wheel", handler, {passive: true});',
		'const handler = event => event.preventDefault(); element.addEventListener("wheel", handler, {passive: true});',
		...[
			'false',
			'{}',
			'{passive: false}',
			'options',
			'{passive}',
			'{passive: enabled}',
			'{passive: 1}',
			'{...options, passive: true}',
			'{passive: true, ...options}',
			'{["passive"]: true}',
			'{passive: true, [key]: false}',
			'{passive: true, passive: false}',
			'{passive: true, passive}',
			'{get passive() { return true; }}',
			'{passive: true, get passive() { return true; }}',
			'{passive() { return true; }}',
		].map(options => listener('event => event.preventDefault()', options)),
		...[
			'{handleEvent(event) { event.preventDefault(); }}',
			'() => event.preventDefault()',
			'event => other.preventDefault()',
			'(event, other) => other.preventDefault()',
			'event => { const alias = event; alias.preventDefault(); }',
			'event => { event = other; event.preventDefault(); }',
			'event => { event.preventDefault(); event = other; }',
			'event => { { const event = other; event.preventDefault(); } }',
			'event => { try {} catch (event) { event.preventDefault(); } }',
			'({preventDefault}) => preventDefault()',
			'(event = fallback) => event.preventDefault()',
			'(...events) => events[0].preventDefault()',
			'function () { arguments[0].preventDefault(); }',
			'event => { const {preventDefault} = event; preventDefault(); }',
			'event => { const prevent = event.preventDefault; prevent(); }',
			'event => event[method]()',
			'event => event.preventDefault',
			'event => event.stopPropagation()',
			'event => event.stopImmediatePropagation()',
			'event => { event.returnValue = false; }',
			'event => setTimeout(() => event.preventDefault())',
			'event => { (() => event.preventDefault())(); }',
			'function * (event) { event.preventDefault(); }',
			'async function * (event) { event.preventDefault(); }',
			'async event => { await task(); event.preventDefault(); }',
			'async event => event.preventDefault(await task())',
			'async event => { for await (const item of stream) { event.preventDefault(); } }',
			'async event => { for await (const item of stream) {} event.preventDefault(); }',
			'async event => { while (condition) { event.preventDefault(); await task(); } }',
			'async event => { for (const item of items) { event.preventDefault(); await task(); } }',
			'async event => { for (await task(); condition;) { event.preventDefault(); } }',
			// The shared timing tracker is intentionally conservative across branches.
			'async event => { if (condition) { await task(); } else { event.preventDefault(); } }',
		].map(callback => listener(callback)),
		'element.removeEventListener("wheel", event => event.preventDefault(), {passive: true});',
		'element[method]("wheel", event => event.preventDefault(), {passive: true});',
		'element.addEventListener(...names, event => event.preventDefault(), {passive: true});',
		'element.addEventListener("wheel", event => event.preventDefault(), ...options);',
		'element.addEventListener("wheel", event => event.preventDefault(), {passive: true}, extra);',
	],
	invalid: [
		'element.addEventListener("click", event => event.preventDefault(), {passive: true});',
		'element.addEventListener("custom", payload => payload.preventDefault(), {passive: true});',
		'element.addEventListener(type, event => event.preventDefault(), {passive: true});',
		listener('event => event[`preventDefault`]()'),
		{
			code: listener('event => <>{event.preventDefault()}</>'),
			languageOptions: {parserOptions: {ecmaFeatures: {jsx: true}}},
		},
		'addEventListener("wheel", event => event.preventDefault(), {passive: true});',
		'addEventListener?.("wheel", event => event.preventDefault(), {passive: true});',
		'element["addEventListener"]("wheel", event => event.preventDefault(), {passive: true});',
		'element?.addEventListener("wheel", event => event.preventDefault(), {passive: true});',
		'element.addEventListener?.("wheel", event => event.preventDefault(), {passive: true});',
		...[
			'function (event) { event.preventDefault(); }',
			'function handler(event) { event.preventDefault(); }',
			'event => event?.preventDefault()',
			'event => event.preventDefault?.()',
			'event => { if (event.cancelable) { event.preventDefault(); } }',
			'event => { event.preventDefault(); event.preventDefault(); }',
			'event => { { const event = other; event.preventDefault(); } event.preventDefault(); }',
			'async event => { event.preventDefault(); await task(); }',
			'async function (event) { event.preventDefault(); await task(); }',
			'async event => { event.preventDefault(); await task(); event.preventDefault(); }',
			'async event => { await task(event.preventDefault()); }',
			'async event => { for await (const item of event.preventDefault()) {} }',
			'event => { for (const item of items) { event.preventDefault(); } }',
			'async event => { for (event.preventDefault(); condition;) { await task(); } }',
			'async event => { for (const item of items) { async function nested() { await task(); } event.preventDefault(); } }',
			'event => { async function nested() { await task(); } event.preventDefault(); }',
			'async event => { await task(); other.addEventListener("click", payload => payload.preventDefault(), {passive: true}); }',
			'event => { other.addEventListener("click", () => {}, {passive: false}); event.preventDefault(); }',
		].map(callback => listener(callback)),
		listener('event => event.preventDefault()', '{passive: false, passive: true}'),
		listener('event => event.preventDefault()', '{get passive() { return false; }, passive: true}'),
		listener('event => event.preventDefault()', '{capture: true, passive: true, once: true}'),
		listener('event => event["preventDefault"]()', '{"passive": true}'),
		listener('((event => (event).preventDefault()))', '({passive: (true)})'),
		listener('event => event.preventDefault(/* keep */)', '{/* before */ passive: (/* value */ true /* after */)}'),
		listener('event => { other.addEventListener("click", event => event.preventDefault(), {passive: true}); }', '{passive: false}'),
		'element.addEventListener("wheel", event => {\r\n  event.preventDefault();\r\n}, {\r\n  passive: true // keep\r\n});\r\n',
	],
});

ruleTest.snapshot({
	testerOptions: {languageOptions: {parser: parsers.typescript}},
	valid: [
		listener('(event: Event) => event.preventDefault()', '{passive: false as const}'),
		listener('(event: Event) => event.preventDefault()', '{passive: enabled as true}'),
		listener('(event: Event) => event.preventDefault()', '{passive: true as const, passive: false}'),
		listener('async (event: Event) => { await task(); event!.preventDefault(); }'),
	],
	invalid: [
		...[
			'event.preventDefault()',
			'event!.preventDefault()',
			'(event as Event).preventDefault()',
			'(<Event>event).preventDefault()',
			'(event satisfies Event).preventDefault()',
			'event.preventDefault!()',
		].map(expression => listener(`(event: Event) => ${expression}`)),
		'element.addEventListener!("wheel", (event: Event) => event.preventDefault(), {passive: true});',
		listener('((event: Event) => event.preventDefault()) as EventListener', '{passive: true} as const'),
		listener('((event: Event) => event.preventDefault()) satisfies EventListener', '{passive: true} satisfies AddEventListenerOptions'),
		listener('<EventListener>((event: Event) => event.preventDefault())', '<AddEventListenerOptions>{passive: true}'),
		...[
			'true as const',
			'true satisfies boolean',
			'<const>true',
			'true!',
		].map(value => listener('(event: Event) => event.preventDefault()', `{passive: ${value}}`)),
		listener('(event: Event) => event.preventDefault()', '{passive: false, passive: true as const}'),
	],
});

ruleTest.typescript({
	valid: [],
	invalid: [{
		code: listener('(event: Event) => event.preventDefault()', '{passive: ((/* keep */ true as const) satisfies boolean)}'),
		errors: [{
			messageId: 'no-prevent-default-in-passive-listener/error',
			suggestions: [{
				messageId: 'no-prevent-default-in-passive-listener/suggestion',
				output: listener('(event: Event) => event.preventDefault()', '{passive: ((/* keep */ false as const) satisfies boolean)}'),
			}],
		}],
	}],
});

test('passive cancellation and late cancellation have separate reports', t => {
	const linter = new Linter();
	const ruleNames = ['no-prevent-default-in-passive-listener', 'no-late-event-control', 'require-passive-events'];
	const config = {
		plugins: {unicorn},
		rules: Object.fromEntries(ruleNames.map(name => [`unicorn/${name}`, 'error'])),
	};
	const code = listener('async event => { event.preventDefault(); await task(); event.preventDefault(); }');
	const messages = linter.verify(code, config);
	t.deepEqual(messages.map(({ruleId}) => ruleId), [
		'unicorn/no-prevent-default-in-passive-listener',
		'unicorn/no-late-event-control',
	]);
	t.true(messages[0].column < messages[1].column);
	t.false(messages.some(message => message.fix));
	const {range, text} = messages[0].suggestions[0].fix;
	const suggestedCode = code.slice(0, range[0]) + text + code.slice(range[1]);
	t.true(suggestedCode.includes('{passive: false}'));
	t.deepEqual(linter.verify(suggestedCode, config).map(({ruleId}) => ruleId), ['unicorn/no-late-event-control']);
	t.is(linter.verifyAndFix(suggestedCode, config).output, suggestedCode);
});

test('rule is enabled in the recommended and unopinionated presets', t => {
	for (const name of ['recommended', 'unopinionated']) {
		t.is(unicorn.configs[name].rules['unicorn/no-prevent-default-in-passive-listener'], 'error');
	}
});
