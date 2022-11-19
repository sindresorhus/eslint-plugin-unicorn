import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// Spread in list
test.snapshot({
	valid: [
		'const array = [[]]',
		'const array = [{}]',
		'const object = ({...[]})',
		'foo([])',
		'foo({})',
		'new Foo([])',
		'new Foo({})',
		'const array = [...a]',
		'const object = {...a}',
		'const [first, ...rest] = []',
		'const {foo, ...rest} = {}',
		'function a(foo, ...rest) {}',
	],
	invalid: [
		'const array = [...[a]]',
		'const object = {...{a}}',
		'foo(...[a])',
		'new Foo(...[a])',

		// Trailing comma
		'const array = [...[a,]]',
		'const object = {...{a,}}',
		'foo(...[a,])',
		'new Foo(...[a,])',

		// Trailing comma in parent
		'const array = [...[a,],]',
		'const object = {...{a,},}',
		'foo(...[a,],)',
		'new Foo(...[a,],)',

		// Parentheses
		'const array = [...(( [a] ))]',
		'const object = {...(( {a} ))}',
		'foo(...(( [a] )))',
		'new Foo(...(( [a] )))',

		// Empty
		'const array = [...[]]',
		'const object = {...{}}',
		'foo(...[])',
		'new Foo(...[])',

		// Hole(s)
		'const array = [...[,]]',
		'foo(...[,])',
		'new Foo(...[,])',
		'const array = [...[,,]]',
		'foo(...[,,])',
		'new Foo(...[,,])',
		'const array = [...[a, , b,]]',
		'foo(...[a, , b,])',
		'new Foo(...[a, , b,])',
		'const array = [...[a, , b,],]',
		'foo(...[a, , b,],)',
		'new Foo(...[a, , b,],)',
		'foo(...[,, ,(( a )), ,,(0, b), ,,])',

		// Extra elements/properties
		'const array = [a, ...[a, b]]',
		'const object = {a, ...{a, b}}',
		'foo(a, ...[a, b])',
		'new Foo(a, ...[a, b])',
		'const array = [...[a, b], b,]',
		'const object = {...{a, b}, b,}',
		'foo(...[a, b], b,)',
		'new Foo(...[a, b], b,)',
		'const array = [a, ...[a, b], b,]',
		'const object = {a, ...{a, b}, b,}',
		'foo(a, ...[a, b], b,)',
		'new Foo(a, ...[a, b], b,)',

		// Duplicated keys
		'({a:1, ...{a: 2}})',
		'({...{a:1}, ...{a: 2}})',
		outdent`
			({
				get a() {},
				set a(v) {},
				...{
					get a() {}
				}
			})
		`,
		// Computed
		'({[a]:1, ...{[a]: 2}})',

		outdent`
			const object = {
				a: 1,

				...{
					testKeys() {
						console.assert(Object.keys(this).length === 2)
					}
				}
			}
			object.testKeys();
		`,

		outdent`
			new Foo(
				foo(
					a,
					...[a, b],
					b,
				),
				...[
					a,
					...[
						a,
						b,
					],
					b,
				],
				{
					a: [...[a, b]],
					...{
						a,
						b,
					},
				}
			)
		`,

		// Code from example in `prefer-spread` rule docs
		outdent`
			const baz = [2];
			call(foo, ...[bar, ...baz]);
		`,

		'Promise.all(...[...iterable])',
		'new Map(...[...iterable])',
	],
});

// Iterable to array
test.snapshot({
	valid: [
		'new NotMatchedConstructor([...iterable])',
		'new foo.Map([...iterable])',
		'new Map([...iterable], extraArgument)',
		'new Map()',
		'new Map(...iterable)',
		'new Map([,...iterable])',
		'new Map([...iterable, extraElement])',
		'new Map({...iterable})',
		'new Uint8Array(...iterable)',
		'new Uint8Array(before, [...iterable])',

		'Promise.notMatchedMethod([...iterable])',
		'NotPromise.all([...iterable])',
		'foo.Promise.all([...iterable])',
		'Promise.all?.([...iterable])',
		'Promise?.all([...iterable])',
		'Promise[all]([...iterable])',
		'Promise.all()',
		'Promise.all([...iterable], extraArgument)',
		'Promise.all(...iterable)',
		'Promise.all([,...iterable])',
		'Promise.all([...iterable, extraElement])',
		'Promise.all({...iterable})',

		'Object.notFromEntries([...iterable])',
		'NotObject.fromEntries([...iterable])',
		'Object.fromEntries?.([...iterable])',
		'Object?.fromEntries([...iterable])',
		'Object[fromEntries]([...iterable])',
		'Object.fromEntries()',
		'Object.fromEntries([...iterable], extraArgument)',
		'Object.fromEntries(...iterable)',
		'Object.fromEntries({...iterable})',

		'Uint8Array.notFrom([...iterable])',
		'NotTypedArray.from([...iterable])',
		'Uint8Array.from?.([...iterable])',
		'Uint8Array?.from([...iterable])',
		'Uint8Array.from([...iterable], extraArgument)',
		'Uint8Array.from(...iterable)',
		'Uint8Array.from({...iterable})',

		'for (const [...iterable] of foo);',
		'for (const foo of bar) [...iterable];',
		'for (const foo of [,...iterable]);',
		'for (const foo of [...iterable, extraElement]);',
		'for (const foo of {...iterable});',
		'for (const foo in [...iterable]);',

		'function * fn() {yield [...iterable];}',
		'function * fn() {yield* [...iterable, extraElement];}',
		'function * fn() {yield* {...iterable};}',
	],
	invalid: [
		'const map = new Map([...iterable])',
		'const weakMap = new WeakMap([...iterable])',
		'const set = new Set([...iterable])',
		'const weakSet = new WeakSet([...iterable])',
		'const typed = new BigUint64Array([...iterable], byteOffset, length)',
		'const typed = new BigUint64Array([...iterable], ...args)',
		'const promise = Promise.all([...iterable])',
		'const promise = Promise.allSettled([...iterable])',
		'const promise = Promise.any([...iterable])',
		'const promise = Promise.race([...iterable])',
		'const array = Array.from([...iterable])',
		'const typed = BigUint64Array.from([...iterable])',
		'const object = Object.fromEntries([...iterable])',
		'for (const foo of [...iterable]);',
		'async () => {for await (const foo of [...iterable]);}',

		// Trailing comma
		'const map = new Map([...iterable,])',
		'for (const foo of [...iterable]);',
		'const map = new Map([...iterable,],)',

		// Parentheses
		'const map = new Map([...(( iterable ))])',
		'for (const foo of [...(( iterable ))]);',
		'const map = new Map((( [...(( iterable ))] )))',
		'for (const foo of (( [...(( iterable ))] )));',
		'for (const foo of[...iterable]);',

		...[
			'[...iterable]',
			'[...iterable,]',
			'(( [...iterable] ))',
			'(( [...(( iterable ))] ))',
		].map(code => outdent`
			function * fn() {
				yield * ${code};
			}
		`),
	],
});

// Cloning an immediate array
test.snapshot({
	valid: [
		'[...not.array]',
		'[...not.array()]',
		'[...array.unknown()]',
		'[...Object.notReturningArray(foo)]',
		'[...NotObject.keys(foo)]',
	],
	invalid: [
		'[...foo.concat(bar)]',
		'[...foo.copyWithin(-2)]',
		'[...foo.filter(bar)]',
		'[...foo.flat()]',
		'[...foo.flatMap(bar)]',
		'[...foo.map(bar)]',
		'[...foo.slice(1)]',
		'[...foo.splice(1)]',
		'[...foo.split("|")]',
		'[...Object.keys(foo)]',
		'[...Object.values(foo)]',
	],
});

test.babel({
	valid: [],
	invalid: [
		{
			code: 'for (const foo of[...iterable]);',
			output: 'for (const foo of iterable);',
			errors: 1,
		},
	],
});

test.typescript({
	valid: [],
	invalid: [
		{
			code: 'for (const foo of[...iterable2]);',
			output: 'for (const foo of iterable2);',
			errors: 1,
		},
	],
});
