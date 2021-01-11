import {outdent} from 'outdent';
import {test} from './utils/test.js';

const MESSAGE_ID = 'prefer-spread';

test({
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
		{
			code: 'const x = Array.from(set);',
			errors: [
				{
					messageId: MESSAGE_ID,
					column: 11,
					line: 1
				}
			],
			output: 'const x = [...set];'
		},
		{
			code: 'Array.from(set).map(() => {});',
			errors: [
				{
					messageId: MESSAGE_ID,
					column: 1,
					line: 1
				}
			],
			output: '[...set].map(() => {});'
		},
		{
			code: 'Array.from(set, mapFn).reduce(() => {});',
			errors: [
				{
					messageId: MESSAGE_ID,
					column: 1,
					line: 1
				}
			],
			output: '[...set].map(mapFn).reduce(() => {});'
		},
		{
			code: 'Array.from(set, mapFn, thisArg).reduce(() => {});',
			errors: [
				{
					messageId: MESSAGE_ID,
					column: 1,
					line: 1
				}
			],
			output: '[...set].map(mapFn, thisArg).reduce(() => {});'
		},
		{
			code: 'Array.from(set, () => {}, thisArg).reduce(() => {});',
			errors: [
				{
					messageId: MESSAGE_ID,
					column: 1,
					line: 1
				}
			],
			output: '[...set].map(() => {}, thisArg).reduce(() => {});'
		},
		{
			code: 'Array.from(new Set([1, 2])).map(() => {});',
			errors: [
				{
					messageId: MESSAGE_ID,
					column: 1,
					line: 1
				}
			],
			output: '[...new Set([1, 2])].map(() => {});'
		},
		{
			code: 'Array.from(document.querySelectorAll("*")).map(() => {});',
			errors: [
				{
					messageId: MESSAGE_ID,
					column: 1,
					line: 1
				}
			],
			output: '[...document.querySelectorAll("*")].map(() => {});'
		},

		// Semicolon
		// #254
		{
			code: outdent`
				const foo = []
				Array.from(arrayLike).forEach(doSomething)
			`,
			errors: [
				{
					messageId: MESSAGE_ID
				}
			],
			output: outdent`
				const foo = []
				;[...arrayLike].forEach(doSomething)
			`
		},
		{
			code: outdent`
				const foo = "1"
				Array.from(arrayLike).forEach(doSomething)
			`,
			errors: [{}],
			output: outdent`
				const foo = "1"
				;[...arrayLike].forEach(doSomething)
			`
		},
		{
			code: outdent`
				const foo = null
				Array.from(arrayLike).forEach(doSomething)
			`,
			errors: [{}],
			output: outdent`
				const foo = null
				;[...arrayLike].forEach(doSomething)
			`
		},
		{
			code: outdent`
				const foo = true
				Array.from(arrayLike).forEach(doSomething)
			`,
			errors: [{}],
			output: outdent`
				const foo = true
				;[...arrayLike].forEach(doSomething)
			`
		},
		{
			code: outdent`
				const foo = 1
				Array.from(arrayLike).forEach(doSomething)
			`,
			errors: [{}],
			output: outdent`
				const foo = 1
				;[...arrayLike].forEach(doSomething)
			`
		},
		{
			code: outdent`
				const foo = /./
				Array.from(arrayLike).forEach(doSomething)
			`,
			errors: [{}],
			output: outdent`
				const foo = /./
				;[...arrayLike].forEach(doSomething)
			`
		},
		{
			code: outdent`
				const foo = /./g
				Array.from(arrayLike).forEach(doSomething)
			`,
			errors: [{}],
			output: outdent`
				const foo = /./g
				;[...arrayLike].forEach(doSomething)
			`
		},
		{
			code: outdent`
				const foo = bar
				Array.from(arrayLike).forEach(doSomething)
			`,
			errors: [{}],
			output: outdent`
				const foo = bar
				;[...arrayLike].forEach(doSomething)
			`
		},
		{
			code: outdent`
				const foo = bar.baz
				Array.from(arrayLike).forEach(doSomething)
			`,
			errors: [{}],
			output: outdent`
				const foo = bar.baz
				;[...arrayLike].forEach(doSomething)
			`
		},
		{
			code: outdent`
				function* foo() {
					yield Array.from(arrayLike).forEach(doSomething)
				}
			`,
			errors: [{}],
			output: outdent`
				function* foo() {
					yield [...arrayLike].forEach(doSomething)
				}
			`
		},
		{
			code: outdent`
				const foo = \`bar\`
				Array.from(arrayLike).forEach(doSomething)
			`,
			errors: [{}],
			output: outdent`
				const foo = \`bar\`
				;[...arrayLike].forEach(doSomething)
			`
		},
		{
			code: outdent`
				const foo = [];
				Array.from(arrayLike).forEach(doSomething)
			`,
			errors: [{}],
			output: outdent`
				const foo = [];
				[...arrayLike].forEach(doSomething)
			`
		},
		// https://github.com/angular/angular/blob/9e70bcb34f91d439f5203dc22a44f323d02c4648/packages/benchpress/src/webdriver/selenium_webdriver_adapter.ts#L37
		// TokenType of `of` is `Identifier`
		{
			code: outdent`
				for (const key of Array.from(arrayLike)) {
				}
			`,
			errors: [{}],
			output: outdent`
				for (const key of [...arrayLike]) {
				}
			`
		},
		// TokenType of `in` is `Keyword`
		{
			code: outdent`
				for (const key in Array.from(arrayLike)) {
				}
			`,
			errors: [{}],
			output: outdent`
				for (const key in [...arrayLike]) {
				}
			`
		},
		// https://github.com/facebook/relay/blob/c7dd4cc33eb2dba82629884bff865f0905fc269e/packages/relay-compiler/transforms/ValidateUnusedVariablesTransform.js#L57
		{
			// eslint-disable-next-line no-template-curly-in-string
			code: 'const foo = `${Array.from(arrayLike)}`',
			errors: [{}],
			// eslint-disable-next-line no-template-curly-in-string
			output: 'const foo = `${[...arrayLike]}`'
		},
		// https://github.com/angular/angular/blob/9e70bcb34f91d439f5203dc22a44f323d02c4648/packages/service-worker/worker/testing/cache.ts#L48
		{
			code: outdent`
				async function foo(){
					return await Array.from(arrayLike)
				}
			`,
			errors: [{}],
			output: outdent`
				async function foo(){
					return await [...arrayLike]
				}
			`
		},

		// https://github.com/gatsbyjs/gatsby/blob/e720d8efe58eba0f6fae9f26ec8879128967d0b5/packages/gatsby/src/bootstrap/page-hot-reloader.js#L30
		{
			code: outdent`
				foo()
				Array.from(arrayLike).forEach(doSomething)
			`,
			errors: [
				{
					messageId: MESSAGE_ID
				}
			],
			output: outdent`
				foo()
				;[...arrayLike].forEach(doSomething)
			`
		},
		// https://github.com/gatsbyjs/gatsby/blob/4ab3f194cf5d6dcafcb2a75d9604aac79d963554/packages/gatsby/src/redux/__tests__/nodes.js#L277
		{
			code: outdent`
				const foo = {}
				Array.from(arrayLike).forEach(doSomething)
			`,
			errors: [
				{
					messageId: MESSAGE_ID
				}
			],
			output: outdent`
				const foo = {}
				;[...arrayLike].forEach(doSomething)
			`
		}
	]
});
