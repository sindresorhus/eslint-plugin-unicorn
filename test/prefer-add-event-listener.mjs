import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const excludeFooOptions = [{excludedPackages: ['foo']}];

test({
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
	invalid: [],
});

test.snapshot({
	valid: [],
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
	],
});

test.typescript({
	valid: [],
	invalid: [
		{
			code: '(el as HTMLElement).onmouseenter = onAnchorMouseEnter;',
			output: '(el as HTMLElement).addEventListener(\'mouseenter\', onAnchorMouseEnter);',
			errors: 1,
		},
	],
});
