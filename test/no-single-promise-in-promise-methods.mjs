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
		'await Promise.all([() => promise])',
		'await Promise.all([a ? b : c])',
		'await Promise.all([x ??= y])',
		'await Promise.all([x ||= y])',
		'await Promise.all([x &&= y])',
		'await Promise.all([x |= y])',
		'await Promise.all([x ^= y])',
		'await Promise.all([x ??= y])',
		'await Promise.all([x ||= y])',
		'await Promise.all([x &&= y])',
		'await Promise.all([x | y])',
		'await Promise.all([x ^ y])',
		'await Promise.all([x & y])',
		'await Promise.all([x !== y])',
		'await Promise.all([x == y])',
		'await Promise.all([x in y])',
		'await Promise.all([x >>> y])',
		'await Promise.all([x + y])',
		'await Promise.all([x / y])',
		'await Promise.all([x ** y])',

		'await Promise.all([promise])',
		'await Promise.all([getPromise()])',
		'await Promise.all([promises[0]])',
		'await Promise.all([await promise])',
		'await Promise.any([promise])',
		'await Promise.race([promise])',
		'await Promise.all([new Promise(() => {})])',
		'+await Promise.all([+1])',
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
	],
	invalid: [
		outdent`
			foo
			await Promise.all([(0, promise)])
		`,
		outdent`
			foo
			Promise.all([(0, promise)])
		`,
		outdent`
			foo
			await Promise.all([[array][0]])
		`,
		outdent`
			foo
			Promise.all([[array][0]])
		`,
		'Promise.all([promise]).then()',
		'Promise.all([1]).then()',
		'Promise.all([(0, promise)]).then()',
	],
});
