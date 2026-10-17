import outdent from 'outdent';
import {getTester} from './utils/test.js';
import parsers from './utils/parsers.js';

const {test} = getTester(import.meta);

// `Promise.any()` wraps rejections in `AggregateError`, so unwrapping an awaited call is only suggested
test.snapshot({
	valid: [],
	invalid: [
		'await Promise.any([Promise.resolve(42)])',
		'const result = await (Promise.any([(promise)]));',
		'await Promise.any([(left, right)])',
		'await Promise./* keep */any([promise])',
		{
			code: 'await Promise.any([promise as Promise<number>])',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'async function run(promise: Promise<number>) { return await Promise.any<number>([promise!]); }',
			languageOptions: {parser: parsers.typescript},
		},
	],
});

// `await`ed
test.snapshot({
	valid: [
	],
	invalid: [
		'await Promise.race([(0, promise)])',
		'async function * foo() {await Promise.race([yield promise])}',
		'async function * foo() {await Promise.race([yield* promise])}',
		'await Promise.race([() => promise,],)',
		'await Promise.race([a ? b : c,],)',
		'await Promise.race([x ??= y,],)',
		'await Promise.race([x ||= y,],)',
		'await Promise.race([x &&= y,],)',
		'await Promise.race([x |= y,],)',
		'await Promise.race([x ^= y,],)',
		'await Promise.race([x | y,],)',
		'await Promise.race([x ^ y,],)',
		'await Promise.race([x & y,],)',
		'await Promise.race([x !== y,],)',
		'await Promise.race([x == y,],)',
		'await Promise.race([x in y,],)',
		'await Promise.race([x >>> y,],)',
		'await Promise.race([x + y,],)',
		'await Promise.race([x / y,],)',
		'await Promise.race([x ** y,],)',
		'await Promise.race([promise,],)',
		'await Promise.race([getPromise(),],)',
		'await Promise.race([promises[0],],)',
		'await Promise.race([await promise])',
		'await Promise.any([promise])',
		'await Promise.any([promise,],)',
		'await Promise.race([promise])',
		'await Promise.race([new Promise(() => {})])',
		'+await Promise.race([+1])',

		// ASI, `Promise.race()` is not really `await`ed
		outdent`
			await Promise.race([(x,y)])
			[0].toString()
		`,
	],
});

// Not `await`ed
test.snapshot({
	valid: [
		'Promise.race([promise, anotherPromise])',
		'Promise.race(notArrayLiteral)',
		'Promise.race([...promises])',
		'Promise.any([promise, anotherPromise])',
		'Promise.notListedMethod([promise])',
		'Promise[race]([promise])',
		'Promise.race([,])',
		'NotPromise.race([promise])',
		'Promise?.race([promise])',
		'Promise.race?.([promise])',
		'Promise.race(...[promise])',
		'Promise.race([promise], extraArguments)',
		'Promise.race()',
		'new Promise.race([promise])',

		// We are not checking these cases
		'globalThis.Promise.race([promise])',
		'Promise["race"]([promise])',

		// This can't be checked
		'Promise.allSettled([promise])',
	],
	invalid: [
		'Promise.race([promise,],)',
		outdent`
			foo
			Promise.race([(0, promise),],)
		`,
		outdent`
			foo
			Promise.race([[array][0],],)
		`,
		'Promise.race([promise]).then()',
		'Promise.race([1]).then()',
		'Promise.race([1.]).then()',
		'Promise.race([.1]).then()',
		'Promise.race([(0, promise)]).then()',
		'const _ = () => Promise.race([ a ?? b ,],)',
		'Promise.race([ {a} = 1 ,],)',
		'Promise.race([ function () {} ,],)',
		'Promise.race([ class {} ,],)',
		'Promise.race([ new Foo ,],).then()',
		'Promise.race([ new Foo ,],).toString',
		'foo(Promise.race([promise]))',
		// `Promise.any` not awaited
		'Promise.any([promise])',
		'foo(Promise.any([promise]))',
		// `Promise.all` as an object property value: reported but not fixed
		'const obj = {p: Promise.all([promise])}',
		'Promise.race([promise]).foo = 1',
		'Promise.race([promise])[0] ||= 1',
		'Promise.race([undefined]).then()',
		'Promise.race([null]).then()',
	],
});

// `Promise.all`
test.snapshot({
	valid: [],
	invalid: [
		// Only fixable if it's in `ExpressionStatement`
		'Promise.all([promise])',
		'await Promise.all([promise])',

		'const foo = () => Promise.all([promise])',
		'const foo = await Promise.all([promise])',
		'foo = await Promise.all([promise])',

		// `Promise.{all, race}()` should not care if the result is used
		'const foo = await Promise.race([promise])',
		'const foo = () => Promise.race([promise])',
		'foo = await Promise.race([promise])',
		'const results = await Promise.any([promise])',
		'const results = await Promise.race([promise])',

		'const [foo] = await Promise.all([promise])',
		'[foo] = await Promise.all([promise])',
		'const foo = (await Promise.all([promise]))[0]',
		'const foo = (await Promise.all([promise]))[0.0]',
		'foo = (await Promise.all([promise]))[0]',
		'const [foo] = await Promise.all([a ? b : c])',

		// Reported, but not fixed.
		'const [foo = bar] = await Promise.all([promise])',
		'const [...foo] = await Promise.all([promise])',
		'const [, foo] = await Promise.all([promise])',
		'const result = ([foo] = await Promise.all([promise]))',
		'const foo = (await Promise.all([promise]))[1]',
		'const foo = (await Promise.all([promise])) /* comment */ [0]',
		'const [/* comment */ foo] = await Promise.all([promise])',
		'const [foo] = await Promise.all([/* comment */ promise])',
		{
			code: 'const [foo]: [Foo] = await Promise.all([promise])',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
		// Reported, but not fixed, the unwrap is rebuilt from the promise node alone
		'await Promise.race([/* comment */ promise])',
		'await Promise.race([promise /* comment */])',
		'await Promise.race([promise, /* comment */])',
		'await Promise.race([\n\t// comment\n\tpromise,\n])',
		'await Promise.any([/* comment */ promise])',
		'Promise.race([/* comment */ promise])',
	],
});

// Unwrapping an expression must keep its leading tokens in expression grammar.
test({
	valid: [],
	invalid: [
		...['', 'const getValue = () => '].flatMap(prefix => [
			'{promise: Promise.resolve(1)}.promise',
			'function () {}.promise',
			'class {}.promise',
		].map(expression => ({
			code: `${prefix}Promise.race([${expression}]);`,
			errors: [{
				messageId: 'no-single-promise-in-promise-methods/error',
				data: {method: 'race'},
				suggestions: [
					{messageId: 'no-single-promise-in-promise-methods/unwrap', output: `${prefix}${prefix && !expression.startsWith('{') ? expression : `(${expression})`};`},
					{messageId: 'no-single-promise-in-promise-methods/use-promise-resolve', output: `${prefix}Promise.resolve(${expression});`},
				],
			}],
		}))),
		{
			code: 'log()\nPromise.race([{promise: Promise.resolve(1)}.promise]);',
			errors: [{
				messageId: 'no-single-promise-in-promise-methods/error',
				data: {method: 'race'},
				suggestions: [
					{messageId: 'no-single-promise-in-promise-methods/unwrap', output: 'log()\n;({promise: Promise.resolve(1)}.promise);'},
					{messageId: 'no-single-promise-in-promise-methods/use-promise-resolve', output: 'log()\nPromise.resolve({promise: Promise.resolve(1)}.promise);'},
				],
			}],
		},
	],
});
