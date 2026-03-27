import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	},
	valid: [
		'await {then}',
		'await a ? b : c',
		'await a || b',
		'await a && b',
		'await a ?? b',
		'await new Foo()',
		'await tagged``',
		'class A { async foo() { await this }}',
		'async function * foo() {await (yield bar);}',
		'await (1, Promise.resolve())',
	],
	invalid: [
		'await []',
		'await [Promise.resolve()]',
		'await (() => {})',
		'await (() => Promise.resolve())',
		'await (a === b)',
		'await (a instanceof Promise)',
		'await (a > b)',
		'await class {}',
		'await class extends Promise {}',
		'await function() {}',
		'await function name() {}',
		'await function() { return Promise.resolve() }',
		'await (<></>)',
		'await (<a></a>)',
		'await 0',
		'await 1',
		'await ""',
		'await "string"',
		'await true',
		'await false',
		'await null',
		'await 0n',
		'await 1n',
		// eslint-disable-next-line no-template-curly-in-string
		'await `${Promise.resolve()}`',
		'await !Promise.resolve()',
		'await void Promise.resolve()',
		'await +Promise.resolve()',
		'await ~1',
		'await ++foo',
		'await foo--',
		'await (Promise.resolve(), 1)',
		outdent`
			async function foo() {
				return await
					// comment
					1;
			}
		`,
		outdent`
			async function foo() {
				return await
					// comment
					1
			}
		`,
		outdent`
			async function foo() {
				return( await
					// comment
					1);
			}
		`,
		outdent`
			foo()
			await []
		`,
		outdent`
			foo()
			await +1
		`,
		outdent`
			async function foo() {
				return await
					// comment
					[];
			}
		`,
		outdent`
			async function foo() {
				throw await
					// comment
					1;
			}
		`,
		outdent`
			console.log(
				await
					// comment
					[]
			);
		`,
		'async function foo() {+await +1}',
		'async function foo() {-await-1}',
		'async function foo() {+await -1}',
	],
});
