import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

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
		'await Promise.race([x ??= y,],)',
		'await Promise.race([x ||= y,],)',
		'await Promise.race([x &&= y,],)',
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
		'await Promise.race([promise])',
		'await Promise.race([new Promise(() => {})])',
		'+await Promise.race([+1])',
		'const foo = await Promise.race([promise])',
		'const foo = () => Promise.race([promise])',
		'foo = await Promise.race([promise])',
		'const results = await Promise.any([promise])',
		'const results = await Promise.race([promise])',

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
		'Promise.race([promise, anotherPromise])',
		'Promise.notListedMethod([promise])',
		'Promise[all]([promise])',
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
		'const foo = () => Promise.race([promise])',
		'const foo = await Promise.all([promise])',
		'foo = await Promise.all([promise])',

		// Fixable, but not provide at this point
		'const [foo] = await Promise.all([promise])',
	],
});


