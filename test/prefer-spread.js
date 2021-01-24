import {outdent} from 'outdent';
import {test} from './utils/test.js';

test.visualize({
	valid: [
		'[...set].map(() => {});',
		// TypedArray.from
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/from
		'Int8Array.from(set);',
		'Uint8Array.from(set);',
		'Uint8ClampedArray.from(set);',
		'Int16Array.from(set);',
		'Uint16Array.from(set);',
		'Int32Array.from(set);',
		'Uint32Array.from(set);',
		'Float32Array.from(set);',
		'Float64Array.from(set);',
		'BigInt64Array.from(set);',
		'BigUint64Array.from(set);',

		// Not `CallExpression`
		'new Array.from(foo);',
		// Not `MemberExpression`
		'from(foo);',
		// `callee.property` is not a `Identifier`
		'Array["from"](foo);',
		// Computed
		'Array[from](foo);',
		// Not `from`
		'Array.foo(foo);',
		// Not `Array`
		'foo.from(foo);',
		// `callee.object.type` is not a `Identifier`
		'lib.Array.from(foo);',
		// More/Less arguments
		'Array.from();',
		'Array.from(foo, mapFn, thisArg, extra);',
		'Array.from(...argumentsArray);',
		// FirstArgument is `ObjectExpression`
		'Array.from({length: 10});'
	],
	invalid: [
		'const x = Array.from(set);',
		'Array.from(set).map(() => {});',
		'Array.from(set, mapFn).reduce(() => {});',
		'Array.from(set, mapFn, thisArg).reduce(() => {});',
		'Array.from(set, () => {}, thisArg).reduce(() => {});',
		'Array.from(new Set([1, 2])).map(() => {});',
		'Array.from(document.querySelectorAll("*")).map(() => {});',

		// Semicolon
		// #254
		outdent`
			const foo = []
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = "1"
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = null
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = true
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = 1
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = /./
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = /./g
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = bar
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = bar.baz
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			function* foo() {
				yield Array.from(arrayLike).forEach(doSomething)
			}
		`,
		outdent`
			const foo = \`bar\`
			Array.from(arrayLike).forEach(doSomething)
		`,
		outdent`
			const foo = [];
			Array.from(arrayLike).forEach(doSomething)
		`,
		// https://github.com/angular/angular/blob/9e70bcb34f91d439f5203dc22a44f323d02c4648/packages/benchpress/src/webdriver/selenium_webdriver_adapter.ts#L37
		// TokenType of `of` is `Identifier`
		outdent`
			for (const key of Array.from(arrayLike)) {
			}
		`,
		// TokenType of `in` is `Keyword`
		outdent`
			for (const key in Array.from(arrayLike)) {
			}
		`,
		// https://github.com/facebook/relay/blob/c7dd4cc33eb2dba82629884bff865f0905fc269e/packages/relay-compiler/transforms/ValidateUnusedVariablesTransform.js#L57
		// eslint-disable-next-line no-template-curly-in-string
		'const foo = `${Array.from(arrayLike)}`',
		// https://github.com/angular/angular/blob/9e70bcb34f91d439f5203dc22a44f323d02c4648/packages/service-worker/worker/testing/cache.ts#L48
		outdent`
			async function foo(){
				return await Array.from(arrayLike)
			}
		`,

		// https://github.com/gatsbyjs/gatsby/blob/e720d8efe58eba0f6fae9f26ec8879128967d0b5/packages/gatsby/src/bootstrap/page-hot-reloader.js#L30
		outdent`
			foo()
			Array.from(arrayLike).forEach(doSomething)
		`,
		// https://github.com/gatsbyjs/gatsby/blob/4ab3f194cf5d6dcafcb2a75d9604aac79d963554/packages/gatsby/src/redux/__tests__/nodes.js#L277
		outdent`
			const foo = {}
			Array.from(arrayLike).forEach(doSomething)
		`
	]
});
