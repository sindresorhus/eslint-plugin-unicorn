import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);

ruleTest({
	valid: [],
	invalid: [
		['do(elements[/* keep */ 0].onclick) = handler; while (false);', 'do elements[/* keep */ 0].addEventListener(\'click\', handler); while (false);'],
		['if (ready) {} else(elements[/* keep */ 0].onclick) = handler;', 'if (ready) {} else elements[/* keep */ 0].addEventListener(\'click\', handler);'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

ruleTest({
	valid: [],
	invalid: [
		['element.onclick = () => { /* keep */ run(); };', 'element.addEventListener(\'click\', () => { /* keep */ run(); });'],
		['elements[/* keep */ index].onclick = handler;', 'elements[/* keep */ index].addEventListener(\'click\', handler);'],
		['element.onclick = function (/* keep */ event) { use(event); };', 'element.addEventListener(\'click\', function (/* keep */ event) { use(event); });'],
		['(getElement(/* keep */)).onclick = handler;', '(getElement(/* keep */)).addEventListener(\'click\', handler);'],
	].map(([code, output]) => ({code, output, errors: 1})),
});

ruleTest({
	valid: [],
	invalid: [
		{
			code: 'element.onclick = () => {\r\n  // keep\r\n  run();\r\n};',
			output: 'element.addEventListener(\'click\', () => {\r\n  // keep\r\n  run();\r\n});',
			errors: 1,
		},
		{
			code: '(element as /* keep */ HTMLElement).onclick = handler;',
			output: '(element as /* keep */ HTMLElement).addEventListener(\'click\', handler);',
			languageOptions: {parser: parsers.typescript},
			errors: 1,
		},
		...[
			'element.onclick = (/* keep */ handler);',
			'element.onclick = (handler /* keep */);',
			'element./* keep */onclick = handler;',
			'element.onclick /* keep */ = handler;',
		].map(code => ({code, errors: 1})),
	],
});

test('commented event handlers retain delivery order and receiver binding', t => {
	const linter = new Linter();
	const assignment = '(getElement(/* keep */).onclick) = function (event) { /* handler */ events.push([event.type, this === element]); };';
	for (const body of [assignment, `do${assignment}while (false);`, `if (false) {} else${assignment}`]) {
		const code = `${body} element.dispatchEvent(new Event("click"));`;
		const {output, fixed, messages} = linter.verifyAndFix(code, {
			plugins: {unicorn: plugin},
			rules: {'unicorn/prefer-add-event-listener': 'error'},
		});
		t.assert.strictEqual(fixed, true);
		t.assert.deepStrictEqual(messages, []);
		t.assert.ok(output.includes('/* keep */'));
		t.assert.ok(output.includes('/* handler */'));
		for (const source of [code, output]) {
			const events = [];
			const element = new EventTarget();
			// Node's EventTarget has no onclick attribute; model its one-time registration through the native event API.
			// eslint-disable-next-line accessor-pairs -- Only the attribute setter is used by the tested code.
			Object.defineProperty(element, 'onclick', {
				set(handler) {
					this.addEventListener('click', handler);
				},
			});
			runInNewContext(source, {
				Event,
				element,
				events,
				getElement() {
					events.push('receiver');
					return element;
				},
			});
			element.dispatchEvent(new Event('click'));
			t.assert.strictEqual(JSON.stringify(events), '["receiver",["click",true],["click",true]]');
		}
	}
});

const excludeFooOptions = [{excludedPackages: ['foo']}];

ruleTest.snapshot({
	valid: [
		'foo.addEventListener(\'click\', () => {})',
		'foo.removeEventListener(\'click\', onClick)',
		'foo.onclick',
		'foo[onclick] = () => {}',
		'foo["onclick"] = () => {}',
		'foo.onunknown = () => {}',
		'foo.setCallBack = () => {console.log(\'foo\')}',
		'setCallBack = () => {console.log(\'foo\')}',
		'foo.onclick.bar = () => {}',
		'foo[\'x\'] = true;',
		'require(`koa`); element.onclick = handler;',
		'require(`sax`); element.onclick = handler;',
		'require(`k\\u{6F}a`); element.onclick = handler;',
		{
			code: 'require(`foo`); element.onclick = handler;',
			options: excludeFooOptions,
		},
		outdent`
			const Koa = require('koa');
			const app = new Koa();

			app.onerror = () => {};
		`,
		outdent`
			const sax = require('sax');
			const parser = sax.parser();

			parser.onerror = () => {};
		`,
		outdent`
			import Koa from 'koa';
			const app = new Koa();

			app.onerror = () => {};
		`,
		outdent`
			import sax from 'sax';
			const parser = sax.parser();

			parser.onerror = () => {};
		`,
		outdent`
			import {sax as foo} from 'sax';
			const parser = foo.parser();

			parser.onerror = () => {};
		`,
		{
			code: outdent`
				const foo = require('foo');

				foo.onerror = () => {};
			`,
			options: excludeFooOptions,
		},
		{
			code: outdent`
				import foo from 'foo';

				foo.onclick = () => {};
			`,
			options: excludeFooOptions,
		},
	],
	invalid: [
		'foo.onclick = () => {}',
		'foo.onclick = 1',
		'foo.bar.onclick = onClick',
		'const bar = null; foo.onclick = bar;',
		'foo.onkeydown = () => {}',
		'foo.ondragend = () => {}',
		outdent`
			foo.onclick = function (e) {
				console.log(e);
			}
		`,
		'foo.onclick = null',
		'foo.onclick = undefined',
		'window.onbeforeunload = null',
		'window.onbeforeunload = undefined',
		'window.onbeforeunload = foo',
		'window.onbeforeunload = () => \'foo\'',
		outdent`
			window.onbeforeunload = () => {
				return bar;
			}
		`,
		outdent`
			window.onbeforeunload = function () {
				return 'bar';
			}
		`,
		outdent`
			window.onbeforeunload = function () {
				return;
			}
		`,
		outdent`
			window.onbeforeunload = function () {
				(() => {
					return 'foo';
				})();
			}
		`,
		outdent`
			window.onbeforeunload = e => {
				console.log(e);
			}
		`,

		outdent`
			const foo = require('foo');

			foo.onerror = () => {};
		`,

		outdent`
			import foo from 'foo';

			foo.onerror = () => {};
		`,

		outdent`
			foo.onerror = () => {};

			function bar() {
				const koa = require('koa');

				koa.onerror = () => {};
			}
		`,

		{
			code: outdent`
				const Koa = require('koa');
				const app = new Koa();

				app.onerror = () => {};
			`,
			options: excludeFooOptions,
		},
		{
			code: outdent`
				import {Koa as Foo} from 'koa';
				const app = new Foo();

				app.onerror = () => {};
			`,
			options: excludeFooOptions,
		},
		{
			code: outdent`
				const sax = require('sax');
				const parser = sax.parser();

				parser.onerror = () => {};
			`,
			options: excludeFooOptions,
		},
		'myWorker.port.onmessage = function(e) {}',
		'((foo)).onclick = ((0, listener))',
		'window.onload = window.onunload = function() {};',
		'window.onunload ??= function() {};',
		'window.onunload ||= function() {};',
		'window.onunload += function() {};',
		// Non-function values should not be autofixed
		'foo.onclick = true',
		'foo.onclick = \'bar\'',
		'foo.onclick = `bar`',
		'foo.onclick = {}',
		'foo.onclick = []',
		'foo.onclick = new Handler()',
	],
});

ruleTest.typescript({
	valid: [],
	invalid: [
		{
			code: '(el as HTMLElement).onmouseenter = onAnchorMouseEnter;',
			output: '(el as HTMLElement).addEventListener(\'mouseenter\', onAnchorMouseEnter);',
			errors: 1,
		},
	],
});

// The assignment keeps comments inside copied operands, while comments in removed syntax prevent fixes
ruleTest({
	valid: [],
	invalid: [
		{
			code: '(/* keep */ (foo)).onclick = ((0, listener))',
			output: '(/* keep */ (foo)).addEventListener(\'click\', (0, listener))',
			errors: 1,
		},
		{
			code: 'foo.onclick = /* keep */ (0, listener)',
			errors: 1,
		},
		{
			code: 'foo.onclick = (0, listener)',
			output: 'foo.addEventListener(\'click\', (0, listener))',
			errors: 1,
		},
	],
});

// `as`, `satisfies` and `!` are erased at compile time, `null as never` still clears the handler
ruleTest({
	valid: [],
	invalid: [
		...[
			'element.onclick = null as never;',
			'element.onclick = undefined as undefined;',
			'element.onclick = null satisfies null;',
			'element.onclick = (null as never)!;',
		].map(code => ({
			code,
			languageOptions: {parser: parsers.typescript},
			errors: [{message: 'Prefer `removeEventListener` over `onclick`.'}],
		})),
	],
});

// `void 0` is `undefined`, it clears the handler instead of adding one
ruleTest({
	valid: [],
	invalid: [
		...[
			'foo.onclick = void 0;',
			'foo.onclick = (void 0);',
		].map(code => ({
			code,
			errors: [{message: 'Prefer `removeEventListener` over `onclick`.'}],
		})),
	],
});

// Assigning an `on*` IDL attribute replaces the previous handler, so a second assignment to the same receiver and property no longer removes the listener the fix adds
ruleTest({
	valid: [],
	invalid: [
		...[
			'element.onclick = handler;\nelement.onclick = null;',
			'element.onclick = handler;\nelement.onclick = other;',
			'function foo() { element.onclick = handler; element.onclick = null; }',
		].map(code => ({code, errors: 2})),
		// A different property or receiver is a different attribute
		{
			code: 'element.onclick = handler;\nelement.onmouseover = null;',
			output: 'element.addEventListener(\'click\', handler);\nelement.onmouseover = null;',
			errors: 2,
		},
	],
});

// A nested block, like an `if` or a loop, is not the closest block the assignment sits in, but it still replaces the handler the fix added
ruleTest({
	valid: [],
	invalid: [
		...[
			'element.onclick = handler;\nif (foo) { element.onclick = other; }',
			'element.onclick = handler;\nfor (;;) { element.onclick = other; }',
			'element.onclick = handler;\nswitch (foo) { case 1: element.onclick = other; }',
			'element.onclick = handler;\nconst foo = () => { element.onclick = other; };',
			'element.onclick = handler;\nclass Foo { method() { element.onclick = other; } }',
			'function foo() { element.onclick = handler; if (bar) { element.onclick = other; } }',
			// Inside another assignment
			'element.onclick = handler;\ncleanup = () => { element.onclick = null; };',
			// Any assignment operator replaces the handler
			'element.onclick = handler;\nelement.onclick ||= other;',
		].map(code => ({code, errors: 2})),
		// A chained assignment
		{
			code: 'element.onclick = handler;\nfoo.onclick = element.onclick = null;',
			errors: 3,
		},
		// A different property or receiver is a different attribute, so it is still fixable
		{
			code: 'element.onclick = handler;\nif (foo) { element.onmouseover = other; }',
			output: 'element.addEventListener(\'click\', handler);\nif (foo) { element.addEventListener(\'mouseover\', other); }',
			errors: 2,
		},
	],
});

// Assigning an `on*` attribute replaces the previous handler, so a rewrite is only safe when nothing else assigns it. A handler that clears the attribute on its first run is the case that matters: the original stops firing after one click, the rewrite keeps the `addEventListener` listener and fires on every click.
test('a handler that reassigns the same `on*` attribute is not autofixed', t => {
	const linter = new Linter();
	const config = {
		plugins: {unicorn: plugin},
		rules: {'unicorn/prefer-add-event-listener': 'error'},
	};

	for (const [code, isFixed] of [
		['const el = getElement(); el.onclick = function () { /* keep */ el.onclick = null; };', false],
		['const el = getElement(); el.onclick = function () { /* keep */ el.onclick = other; };', false],
		['const el = getElement(); el.onclick = () => { /* keep */ if (x) { el.onclick = null; } };', false],
		['const el = getElement(); el.onclick = () => { /* keep */ el.onclick = el.onclick; };', false],
		// A handler that only reads the element is safe
		['const el = getElement(); el.onclick = function () { /* keep */ use(el); };', true],
		['const el = getElement(); el.onclick = handler;', true],
		// A different property is a different handler
		['const el = getElement(); el.onclick = function () { el.onkeydown = null; };', true],
		// A sibling assignment was already caught before this fix
		['const el = getElement(); el.onclick = null; el.onclick = handler;', false],
	]) {
		const problem = linter.verify(code, config).find(problem => !problem.fatal);

		t.assert.ok(problem, `should report \`${code}\``);
		t.assert.strictEqual(Boolean(problem.fix), isFixed, `fix availability for \`${code}\``);
	}
});

ruleTest({
	valid: [],
	invalid: [
		{code: '({node: element}.node.onclick) = handler;', output: '({node: element}.node).addEventListener(\'click\', handler);', errors: 1},
		...[
			'require(``); element.onclick = handler;',
			'require(`koa${name}`); element.onclick = handler;', // eslint-disable-line no-template-curly-in-string
			'require(tag`koa`); element.onclick = handler;',
		].map(code => ({code, output: code.replace('element.onclick = handler', 'element.addEventListener(\'click\', handler)'), errors: 1})),
	],
});
