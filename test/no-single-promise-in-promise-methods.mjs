import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Promise.all([promise, anotherPromise])',
		'Promise.all(notArrayExpression)',
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
		'await Promise.all([promise])',
		'await Promise.all([func()])',
		'await Promise.all([promises[0]])',
		'await Promise.all([await promise])',
		'await Promise.any([promise])',
		'await Promise.race([promise])',
		'Promise.all([somethingMaybeNotPromise])',
		'await Promise.all([new Promise(() => {})])',
		'+await Promise.all([+1])',
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
	],
});
