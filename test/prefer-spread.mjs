import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// `Array.from`
test.snapshot({
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
		'Array.from(set, mapFn).reduce(() => {});',
		'Array.from(set, mapFn, thisArg).reduce(() => {});',
		'Array.from(set, () => {}, thisArg).reduce(() => {});',
		// FirstArgument is `ObjectExpression`
		'Array.from({length: 10});',
	],
	invalid: [
		'const x = Array.from(set);',
		'Array.from(set).map(() => {});',
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
		`,

		'(Array).from(foo)',
		'(Array.from)(foo)',
		'((Array).from)(foo)',
		'(Array).from((0, foo))',
		'(Array.from)((0, foo))',
		'((Array).from)((0, foo))',
		'Array.from(a ? b : c)',
		'Array.from((0, a))',
		'Array.from([...a, ...b], )',
		'Array.from([1])',
		'Array.from([...a, ...b])',
		'/* 1 */ Array /* 2 */ .from /* 3 */ ( /* 4 */ a /* 5 */,)',
	],
});

// `Array#concat`
test.snapshot({
	valid: [
		'new Array.concat(1)',
		'concat(1)',
		'array[concat](1)',
		'"foo".concat("bar")',
		// eslint-disable-next-line no-template-curly-in-string
		'`${foo}`.concat("bar")',
		outdent`
			const string = 'foo';
			foo = string.concat("bar");
		`,
		// #1068
		'const bufA = Buffer.concat([buf1, buf2, buf3], totalLength);',
		'Foo.concat(1)',
		'FooBar.concat(1)',
		'global.Buffer.concat([])',
		// #1809
		'["1", "2"].join(",").concat("...")',
		'foo.join(",").concat("...")',
		'foo.join().concat(bar)',
		'(a + b).concat(c)',
	],
	invalid: [
		'[1].concat(2)',
		'[1].concat([2, 3])',
		'[1].concat(2,)',
		'[1].concat([2, ...bar],)',
		'[1,].concat(2)',
		'[1,].concat([2, 3])',
		'[1,].concat(2,)',
		'[1,].concat([2, 3],)',
		'(( (( (( [1,] )).concat ))( (([2, 3])) ,) ))',
		'(( (( (( [1,] )).concat ))( (([2, 3])) , bar ) ))',
		'foo.concat(2)',
		'foo.concat([2, 3])',
		'foo.concat(2,)',
		'foo.concat([2, 3],)',
		'(( (( ((foo)).concat ))( (([2, 3])) ,) ))',
		'(( (( ((foo)).concat ))( (([2, 3])) , bar ) ))',
		// Semicolon
		outdent`
			bar()
			foo.concat(2)
		`,
		'const foo = foo.concat(2)',
		'const foo = () => foo.concat(2)',
		outdent`
			const five = 2 + 3;
			foo.concat(five);
		`,
		outdent`
			const array = [2 + 3];
			foo.concat(array);
		`,
		'foo.concat([bar])',
		'foo.concat(bar)',
		'Array.from(set).concat([2, 3])',
		'foo.concat([2, 3]).concat(4)',
		// `String#concat` is wrongly detected, but people should use `+` to concat string
		'string.concat("bar")',
		'foo.concat(2, 3)',
		'foo.concat(2, bar)',
		// This is output of last case
		'[...foo, 2].concat(bar)',
		'let sortedScores = scores.concat().sort((a, b) => b[0] - a[0]);',
		// Suggestion output should include fixable arguments after the first one
		'foo.concat(bar, 2, 3)',
		'foo.concat(bar, 2, 3, baz)',
		// Parentheses
		'async function a() {return [].concat(await bar)}',
		'async function a() {return [].concat((0, bar))}',
		'async function a() {return [].concat(((await bar)))}',
		'foo.concat((0, 1))',
		'async function a() {return (await bar).concat(1)}',
		// No fix, no suggestions
		'[].concat(...bar)',
		// Should keep holes
		'[].concat([,], [])',
		'[,].concat([,], [,])',
		'[,].concat([,,], [,])',
		'[,].concat([,], [,,])',
		'[1].concat([2,], [3,])',
		'[1].concat([2,,], [3,,])',
		'[1,].concat([2,], [3,])',
		'[1,].concat([2,,], [3,,])',
		// Should not insert extra holes
		'[].concat([], [])',
		outdent`
			const EMPTY_STRING = ""
			const EMPTY_STRING_IN_ARRAY = ""
			const EMPTY_STRING_IN_ARRAY_OF_ARRAY = ""
			const array = [].concat(
				undefined,
				null,
				EMPTY_STRING,
				false,
				0,
				[EMPTY_STRING_IN_ARRAY],
				[[EMPTY_STRING_IN_ARRAY_OF_ARRAY]]
			)
		`,
		'[].concat((a.b.c), 2)',
		'[].concat(a.b(), 2)',
		'foo.concat(bar, 2, [3, 4], baz, 5, [6, 7])',
		'foo.concat(bar, 2, 3, ...baz)',
		'notClass.concat(1)',
		'_A.concat(1)',
		// Constants
		'FOO.concat(1)',
		'A.concat(1)',
		'Foo.x.concat(1)',
		// Semicolon
		'if (test) foo.concat(1)',
		'if (test) {} else foo.concat(1)',
		'if (test) {} else foo.concat(1)',
		'for (;;) foo.concat(1)',
		'for (a in b) foo.concat(1)',
		'for (a in b) foo.concat(1)',
		'for (const a of b) foo.concat(1)',
		'while (test) foo.concat(1)',
		'do foo.concat(1); while (test)',
		{
			code: 'with (foo) foo.concat(1)',
			parserOptions: {ecmaVersion: 6, sourceType: 'script'},
		},
		// Code from example in docs
		outdent`
			const baz = [2];
			call(foo, ...[bar].concat(baz));
		`,
		// This not considered `Array#join()` since there are more than one argument
		'foo.join(foo, bar).concat("...")',
	],
});

// `Array#slice`
test.snapshot({
	valid: [
		'new Array.slice()',
		'slice()',
		'array[slice]()',
		'array.slice',
		'array.slice(1)',
		'array.slice(...[])',
		'array.slice(...[0])',
		'array.slice(0 + 0)',
		'array.slice("")',
		'array.slice(null)',
		'const ZERO = 0;array.slice(ZERO)',
		'array.slice(0, array.length)',
		'array.slice(0, 0)',
		'array.notSlice()',
		// Why would someone write these
		'[...foo].slice()',
		'[foo].slice()',
		// Ignored
		'arrayBuffer.slice()',
		'blob.slice()',
		'buffer.slice()',
		'file.slice()',
		'class A {foo() {this.slice()}}',
	],
	invalid: [
		'array.slice()',
		'array.slice().slice()',
		'array.slice(1).slice()',
		'array.slice().slice(1)',
		'const copy = array.slice()',
		'(( (( (( array )).slice ))() ))',
		// Semicolon
		outdent`
			bar()
			foo.slice()
		`,
		// `{String,TypedArray}#slice` are wrongly detected
		'"".slice()',
		'new Uint8Array([10, 20, 30, 40, 50]).slice()',
		'array.slice(0)',
		'array.slice(0b0)',
		'array.slice(0.00)',
		'array.slice(0.00, )',
	],
});

// `Array#toSpliced`
test.snapshot({
	valid: [
		'new Array.toSpliced()',
		'toSpliced()',
		'array[toSpliced]()',
		'array.toSpliced',
		'array.toSpliced(0)',
		'array.toSpliced(...[])',
		'array.toSpliced(...[0])',
		'array.toSpliced(0 + 0)',
		'array.toSpliced("")',
		'array.toSpliced(null)',
		'const ZERO = 0;array.toSpliced(0, ZERO)',
		'array.toSpliced(0, array.length)',
		'array.toSpliced(0, 0)',
		'array.notToSpliced()',
		// Why would someone write these
		'[...foo].toSpliced()',
		'[foo].toSpliced()',
		'array.toSpliced(100, 0)',
		'array.toSpliced(-1, 0)',
	],
	invalid: [
		'array.toSpliced()',
		'array.toSpliced().toSpliced()',
		'const copy = array.toSpliced()',
		'(( (( (( array )).toSpliced ))() ))',
		// Semicolon
		outdent`
			bar()
			foo.toSpliced()
		`,
		// `{String,TypedArray}#toSpliced` are wrongly detected
		'"".toSpliced()',
		'new Uint8Array([10, 20, 30, 40, 50]).toSpliced()',
	],
});

// `String#slice('')`
test.snapshot({
	valid: [
		'new foo.split("")',
		'split("")',
		'string[split]("")',
		'string.split',
		'string.split(1)',
		'string.split(..."")',
		'string.split(...[""])',
		'string.split("" + "")',
		'string.split(0)',
		'string.split(false)',
		'string.split(undefined)',
		'string.split(0n)',
		'string.split(null)',
		'string.split(/""/)',
		'string.split(``)',
		'const EMPTY_STRING = ""; string.split(EMPTY_STRING)',
		'string.split("", limit)',
		'"".split(string)',
		'string.split()',
		'string.notSplit("")',
		'const notString = 0; notString.split("")',
	],
	invalid: [
		'"string".split("")',
		'"string".split(\'\')',
		'unknown.split("")',
		'const characters = "string".split("")',
		'(( (( (( "string" )).split ))( (("")) ) ))',
		// Semicolon
		outdent`
			bar()
			foo.split("")
		`,
		'unknown.split("")',
		// Not result the same
		'"🦄".split("")',
		'const {length} = "🦄".split("")',
	],
});
