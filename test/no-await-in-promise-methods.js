import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Promise.all([promise1, promise2, promise3, promise4])',
		'Promise.allSettled([promise1, promise2, promise3, promise4])',
		'Promise.any([promise1, promise2, promise3, promise4])',
		'Promise.race([promise1, promise2, promise3, promise4])',
		'Promise.all(...[await promise])',
		'Promise.all([await promise], extraArguments)',
		'Promise.all()',
		'Promise.all(notArrayExpression)',
		'Promise.all([,])',
		'Promise[all]([await promise])',
		'Promise.all?.([await promise])',
		'Promise?.all([await promise])',
		'Promise.notListedMethod([await promise])',
		'NotPromise.all([await promise])',
		'new Promise.all([await promise])',
		'Promise.all([(async () => await promise)()])',
		'Promise.all([async function () { await promise }])',
		'Promise.all([foo.then(async value => await value)])',
		'Promise.all([class { async foo() { await bar } }])',
		'Promise.all([{async foo() { await bar }}])',
		'await Promise.all([promise])',
		'Promise.all([await promise].map(foo))',
		'Promise.all(await promises)',
		'Promise.all([promise]).then(await foo)',
		'foo([await promise])',
		'foo([(await promise).bar])',
		'async function foo() { await Promise.all([promise]) }',
		'Promise.all([async function * () { await promise }])',
		'Promise.all([class { static async foo() { await bar } }])',
		'Promise.all([class { foo = async () => await bar }])',
		'Promise.all([new Promise(async resolve => resolve(await promise))])',
		'Promise.all([promise1, promise2].map(async promise => (await promise).foo))',

		// We are not checking these cases
		'globalThis.Promise.all([await promise])',
		'Promise["all"]([await promise])',
	],
	invalid: [
		'Promise.all([await promise])',
		'Promise.allSettled([await promise])',
		'Promise.any([await promise])',
		'Promise.race([await promise])',
		'Promise.all([, await promise])',
		'Promise.all([await promise,])',
		'Promise.all([await promise],)',
		'Promise.all([await (0, promise)],)',
		'Promise.all([await (( promise ))])',
		'Promise.all([await await promise])',
		'Promise.all([...foo, await promise1, await promise2])',
		// Multiple awaited elements without a spread
		'Promise.all([await promise1, await promise2])',
		'Promise.any([await a, await b, await c])',
		'Promise.all([await /* comment*/ promise])',
		// Nested `await`
		'Promise.all([(await promise, 0)])',
		'Promise.all([(await promise).foo, anotherPromise])',
		'Promise.all([foo ? await promise : anotherPromise, anotherPromise])',
		'Promise.all([foo && await promise, anotherPromise])',
		'Promise.all([fetch(await getUrl()), anotherPromise])',
		'Promise.all([...await promises, anotherPromise])',
		'Promise.all([{foo: await promise}])',
		'Promise.all([[await promise]])',
		'Promise.all([(await promise1) + (await promise2)])',
		'Promise.all([await (await promise).foo])',
		'Promise.all([Promise.all([await promise]), anotherPromise])',
		'Promise.all([async () => {}, (await promise).foo])',
		{
			code: 'Promise.all([(await promise as Foo).bar])',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Promise.all([(await promise)!])',
			languageOptions: {parser: parsers.typescript},
		},
		'Promise.all([(await promise)?.foo, anotherPromise])',
		// eslint-disable-next-line no-template-curly-in-string
		'Promise.all([tag`${await promise}`, anotherPromise])',
		{
			code: 'Promise.all([<div>{await promise}</div>, anotherPromise])',
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		// Only the outer `await` is reported
		'Promise.all([await foo(await promise)])',
		// Method name in the message
		'Promise.allSettled([(await promise).foo, anotherPromise])',
		'Promise.any([(await promise).foo, anotherPromise])',
		'Promise.race([(await promise).foo, anotherPromise])',
		// Direct and nested `await` in the same array
		'Promise.all([await promise1, (await promise2).foo])',
		// Parentheses
		'Promise.all([(await promise)])',
		'Promise.all([((await promise)).foo])',
		// More expression types
		'Promise.all([new Foo(await bar)])',
		'Promise.all([foo[await bar]])',
		'Promise.all([foo?.[await bar]])',
		'Promise.all([(await promise)()])',
		'Promise.all([(await tag)`foo`])',
		// eslint-disable-next-line no-template-curly-in-string
		'Promise.all([`${await promise}`, anotherPromise])',
		'Promise.all([foo ?? await bar])',
		'Promise.all([!await foo, anotherPromise])',
		'Promise.all([(foo = await bar)])',
		'Promise.all([({foo} = await bar)])',
		'Promise.all([(foo, await bar)])',
		'Promise.all([...(await promise).items, anotherPromise])',
		'Promise.all([import(await getPath()), anotherPromise])',
		'Promise.all([await promise.then(foo)])',
		// Computed keys and class heritage are evaluated eagerly
		'Promise.all([{[await key]: value}])',
		'Promise.all([{async [await key]() {}}])',
		'Promise.all([class { [await key]() {} }])',
		'Promise.all([class extends (await Base) {}])',
		// Array that is not the `Promise` method argument
		'Promise.all([foo([await promise])])',
		'Promise.all([Promise.all(await promises), anotherPromise])',
		// Nested `Promise` method calls are each reported
		'Promise.all([await Promise.all([await promise])])',
		// Inside an async function
		'async function foo() { return Promise.all([(await promise).foo, anotherPromise]); }',
		// Multiline
		outdent`
			Promise.all([
				await
					promise,
				anotherPromise,
			]);
		`,
		// TypeScript
		{
			code: 'Promise.all([await promise as Foo])',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Promise.all([await promise satisfies Foo])',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Promise.all([<Foo>await promise])',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Promise.all([await promise!])',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'Promise.all([(await promise)<Foo>()])',
			languageOptions: {parser: parsers.typescript},
		},
		// JSX attribute
		{
			code: 'Promise.all([<Foo bar={await promise} />, anotherPromise])',
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
	],
});
