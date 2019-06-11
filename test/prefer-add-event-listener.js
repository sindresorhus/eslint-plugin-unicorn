import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/prefer-add-event-listener';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const testCaseWithOptions = (code, options) => {
	return {
		code,
		options
	};
};

const invalidTestCase = (code, correctCode, eventType, message) => {
	return {
		code,
		output: correctCode || code,
		errors: eventType ?
			[{message: `Prefer \`addEventListener\` over \`${eventType}\`.`}] :
			[{message}]
	};
};

const invalidTestCaseWithOptions = (code, correctCode, eventType, options) => {
	return {
		code,
		output: correctCode || code,
		errors: [{message: `Prefer \`addEventListener\` over \`${eventType}\`.`}],
		options
	};
};

const expectedBeforeUnloadWithReturnMessage = [
	'Prefer `addEventListener` over `onbeforeunload`.',
	'Use `event.preventDefault(); event.returnValue = \'foo\'` to trigger the prompt.'
].join(' ');

ruleTester.run('prefer-add-event-listener', rule, {
	valid: [
		'foo.addEventListener(\'click\', () => {})',
		'foo.removeEventListener(\'click\', onClick)',
		'foo.onclick',
		'foo.setCallBack = () => {console.log(\'foo\')}',
		'setCallBack = () => {console.log(\'foo\')}',
		'foo.onclick.bar = () => {}',
		'foo[\'x\'] = true;',
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
		testCaseWithOptions(
			outdent`
				const foo = require('foo');

				foo.onerror = () => {};
			`,
			[{excludedPackages: ['foo']}]
		),
		testCaseWithOptions(
			outdent`
				import foo from 'foo';

				foo.onclick = () => {};
			`,
			[{excludedPackages: ['foo']}]
		)
	],

	invalid: [
		invalidTestCase(
			'foo.onclick = () => {}',
			'foo.addEventListener(\'click\', () => {})',
			'onclick'
		),
		invalidTestCase(
			'foo.onclick = 1',
			'foo.addEventListener(\'click\', 1)',
			'onclick'
		),
		invalidTestCase(
			'foo.bar.onclick = onClick',
			'foo.bar.addEventListener(\'click\', onClick)',
			'onclick'
		),
		invalidTestCase(
			'const bar = null; foo.onclick = bar;',
			'const bar = null; foo.addEventListener(\'click\', bar);',
			'onclick'
		),
		invalidTestCase(
			'foo.onkeydown = () => {}',
			'foo.addEventListener(\'keydown\', () => {})',
			'onkeydown'
		),
		invalidTestCase(
			'foo.ondragend = () => {}',
			'foo.addEventListener(\'dragend\', () => {})',
			'ondragend'
		),
		invalidTestCase(
			outdent`
				foo.onclick = function (e) {
					console.log(e);
				}
			`,
			outdent`
				foo.addEventListener('click', function (e) {
					console.log(e);
				})
			`,
			'onclick'
		),
		invalidTestCase(
			'foo.onclick = null',
			null,
			null,
			'Prefer `removeEventListener` over `onclick`.'
		),
		invalidTestCase(
			'foo.onclick = undefined',
			null,
			null,
			'Prefer `removeEventListener` over `onclick`.'
		),
		invalidTestCase(
			'window.onbeforeunload = null',
			null,
			null,
			'Prefer `removeEventListener` over `onbeforeunload`.'
		),
		invalidTestCase(
			'window.onbeforeunload = undefined',
			null,
			null,
			'Prefer `removeEventListener` over `onbeforeunload`.'
		),
		invalidTestCase(
			'window.onbeforeunload = foo',
			null,
			null,
			expectedBeforeUnloadWithReturnMessage
		),
		invalidTestCase(
			'window.onbeforeunload = () => \'foo\'',
			null,
			null,
			expectedBeforeUnloadWithReturnMessage
		),
		invalidTestCase(
			outdent`
				window.onbeforeunload = () => {
					return bar;
				}
			`,
			null,
			null,
			expectedBeforeUnloadWithReturnMessage
		),
		invalidTestCase(
			outdent`
				window.onbeforeunload = function () {
					return 'bar';
				}
			`,
			null,
			null,
			expectedBeforeUnloadWithReturnMessage
		),
		invalidTestCase(
			outdent`
				window.onbeforeunload = function () {
					return;
				}
			`,
			outdent`
				window.addEventListener('beforeunload', function () {
					return;
				})
			`,
			'onbeforeunload'
		),
		invalidTestCase(
			outdent`
				window.onbeforeunload = function () {
					(() => {
						return 'foo';
					})();
				}
			`,
			outdent`
				window.addEventListener('beforeunload', function () {
					(() => {
						return 'foo';
					})();
				})
			`,
			'onbeforeunload'
		),
		invalidTestCase(
			outdent`
				window.onbeforeunload = e => {
					console.log(e);
				}
			`,
			outdent`
				window.addEventListener('beforeunload', e => {
					console.log(e);
				})
			`,
			'onbeforeunload'
		),
		invalidTestCase(
			outdent`
				const foo = require('foo');

				foo.onerror = () => {};
			`,
			outdent`
				const foo = require('foo');

				foo.addEventListener('error', () => {});
			`,
			'onerror'
		),
		invalidTestCase(
			outdent`
				import foo from 'foo';

				foo.onerror = () => {};
			`,
			outdent`
				import foo from 'foo';

				foo.addEventListener('error', () => {});
			`,
			'onerror'
		),
		invalidTestCase(
			outdent`
				foo.onerror = () => {};

				function bar() {
					const koa = require('koa');

					koa.onerror = () => {};
				}
			`,
			outdent`
				foo.addEventListener('error', () => {});

				function bar() {
					const koa = require('koa');

					koa.onerror = () => {};
				}
			`,
			'onerror'
		),
		invalidTestCaseWithOptions(
			outdent`
				const Koa = require('koa');
				const app = new Koa();

				app.onerror = () => {};
			`,
			outdent`
				const Koa = require('koa');
				const app = new Koa();

				app.addEventListener('error', () => {});
			`,
			'onerror',
			[{excludedPackages: ['foo']}]
		),
		invalidTestCaseWithOptions(
			outdent`
				import {Koa as Foo} from 'koa';
				const app = new Foo();

				app.onerror = () => {};
			`,
			outdent`
				import {Koa as Foo} from 'koa';
				const app = new Foo();

				app.addEventListener('error', () => {});
			`,
			'onerror',
			[{excludedPackages: ['foo']}]
		),
		invalidTestCaseWithOptions(
			outdent`
				const sax = require('sax');
				const parser = sax.parser();

				parser.onerror = () => {};
			`,
			outdent`
				const sax = require('sax');
				const parser = sax.parser();

				parser.addEventListener('error', () => {});
			`,
			'onerror',
			[{excludedPackages: []}]
		)
	]
});
