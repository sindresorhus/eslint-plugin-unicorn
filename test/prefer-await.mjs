import outdent from 'outdent';
import indentString from 'indent-string'
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'promise.then',
		'promise.catch',
		'then(() => {})',

		// Not checking
		'promise["catch"](() => {})',
	],
	invalid: [
		'promise.then(() => {})',
		'promise.then(foo)',
		'promise.then(null, () => {})',
		'promise.then(null, foo)',
		'promise.catch(() => {})',
		'promise.catch(foo)',
		'promise.finally(() => {})',
		'promise.finally(foo)',

		...[
			'promise.then(foo)',
			'promise.then(foo);',
			'promise.then(foo.bar);',
			'promise.then( (( foo )) )',
			'promise.then(new Foo)',
			'promise.then(foo ?? bar)',
			outdent`
				const foo = []
				promise.then([foo][0])
			`,
			'promise.then(() => {})',
			'promise.then(() => ({}))',
			outdent`
				promise.then(() => {
					return []
				})
			`,
			outdent`
				promise.then(() => {
					function a() {
						return []
					}
				})
			`,
			'promise.then((a) => {})',
			'promise.then(({a}) => {})',
			'promise.then(([]) => {})',
			'promise.then(({}) => {})',
			outdent`
				promise.then(({a}) => {
					const b = 1;
				})
			`,
			outdent`
				const a = 1, b = 2;
				promise.then(({a}) => {
					const b = 1;
				})
			`,
			'(( promise.then(() => {}) ))',
			'promise.then(async () => {})',
			'promise.then(function * () {})',
			'promise.then(async function * () {})',
			'promise.then((...foo) => {})',
			'promise.then((a, extraParameter) => {})',
		].flatMap(code => [
			code,
			outdent`
				function nonAsyncFunction() {
				${indentString(code, 1, {indent: '\t'})}
				}
			`,
			outdent`
				async function asyncFunction() {
				${indentString(code, 1, {indent: '\t'})}
				}
			`,
		]),
		outdent`
			async function * a() {
				promise.then(call);
			}
		`,
		outdent`
			const object = {
				a() {
					promise.then(call);
				}
			}
		`,
		outdent`
			const object = {
				async a() {
					promise.then(call);
				}
			}
		`,
		outdent`
			const object = {
				async * a() {
					promise.then(call);
				}
			}
		`,
		outdent`
			class A {
				a() {
					promise.then(call);
				}
			}
		`,
		outdent`
			class A {
				async a() {
					promise.then(call);
				}
			}
		`,
		outdent`
			class A {
				async * a() {
					promise.then(call);
				}
			}
		`,
		outdent`
			promise.then(call1)
				.then(call2)
				.then(call3);
		`,
		outdent`
			try {
				promise.then(call);
			} catch {}
		`,
		outdent`
			function foo() {
				return promise.then(call1)
			}
		`,
		outdent`
			class A {
				a() {
					return promise.then(call);
				}
			}
		`,
		outdent`
			const object = {
				a() {
					return promise.then(call);
				}
			}
		`,
		outdent`
			const object = {
				a: function() {
					return promise.then(call);
				}
			}
		`,
	],
});
