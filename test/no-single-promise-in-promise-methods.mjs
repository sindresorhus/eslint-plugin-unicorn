import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

// `await`ed
test.snapshot({
	valid: [
	],
	invalid: [
		'await Promise.all([(0, promise)])',
		'async function * foo() {await Promise.all([yield promise])}',
		'async function * foo() {await Promise.all([yield* promise])}',
		'await Promise.all([() => promise,],)',
		'await Promise.all([a ? b : c,],)',
		'await Promise.all([x ??= y,],)',
		'await Promise.all([x ||= y,],)',
		'await Promise.all([x &&= y,],)',
		'await Promise.all([x |= y,],)',
		'await Promise.all([x ^= y,],)',
		'await Promise.all([x ??= y,],)',
		'await Promise.all([x ||= y,],)',
		'await Promise.all([x &&= y,],)',
		'await Promise.all([x | y,],)',
		'await Promise.all([x ^ y,],)',
		'await Promise.all([x & y,],)',
		'await Promise.all([x !== y,],)',
		'await Promise.all([x == y,],)',
		'await Promise.all([x in y,],)',
		'await Promise.all([x >>> y,],)',
		'await Promise.all([x + y,],)',
		'await Promise.all([x / y,],)',
		'await Promise.all([x ** y,],)',
		'await Promise.all([promise,],)',
		'await Promise.all([getPromise(),],)',
		'await Promise.all([promises[0],],)',
		'await Promise.all([await promise])',
		'await Promise.any([promise])',
		'await Promise.race([promise])',
		'await Promise.all([new Promise(() => {})])',
		'+await Promise.all([+1])',
		'const results = await Promise.all([promise])',
		'results = await Promise.all([promise])',
		'const results = await Promise.any([promise])',
		'const results = await Promise.race([promise])',

		// ASI, `Promise.all()` is not really `await`ed
		outdent`
			await Promise.all([(x,y)])
			[0].toString()
		`,
	],
});

// Not `await`ed
test.snapshot({
	valid: [
		'Promise.all([promise, anotherPromise])',
		'Promise.all(notArrayLiteral)',
		'Promise.all([...promises])',
		'Promise.any([promise, anotherPromise])',
		'Promise.race([promise, anotherPromise])',
		'Promise.notListedMethod([promise])',
		'Promise[all]([promise])',
		'Promise.all([,])',
		'NotPromise.all([promise])',
		'Promise?.all([promise])',
		'Promise.all?.([promise])',
		'Promise.all(...[promise])',
		'Promise.all([promise], extraArguments)',
		'Promise.all()',
		'new Promise.all([promise])',

		// We are not checking these cases
		'globalThis.Promise.all([promise])',
		'Promise["all"]([promise])',

		// This can't be checked
		'Promise.allSettled([promise])',
	],
	invalid: [
		'Promise.all([promise,],)',
		outdent`
			foo
			Promise.all([(0, promise),],)
		`,
		outdent`
			foo
			Promise.all([[array][0],],)
		`,
		'Promise.all([promise]).then()',
		'Promise.all([1]).then()',
		'Promise.all([1.]).then()',
		'Promise.all([.1]).then()',
		'Promise.all([(0, promise)]).then()',
		'const _ = () => Promise.all([ a ?? b ,],)',
		'Promise.all([ {a} = 1 ,],)',
		'Promise.all([ function () {} ,],)',
		'Promise.all([ class {} ,],)',
		'Promise.all([ new Foo ,],).then()',
		'Promise.all([ new Foo ,],).toString',
		'foo(Promise.all([promise]))',
		'Promise.all([promise]).foo = 1',
		'Promise.all([promise])[0] ||= 1',
		'Promise.all([undefined]).then()',
		'Promise.all([null]).then()',
	],
});
