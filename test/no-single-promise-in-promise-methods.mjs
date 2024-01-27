import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const error = {
	messageId: 'no-single-promise-in-promise-methods/error',
};

test.snapshot({
	valid: [
		'Promise.all([promise, anotherPromise])',
		'Promise.all(notArrayLiteral)',
		'Promise.all([...promises])',
		'Promise.all([await -1])',
		'Promise.any([promise, anotherPromise])',
		'Promise.race([promise, anotherPromise])',
		'Promise.allSettled([promise])',
		'Promise[all]([promise])',
		'Promise.all([,])',
		'NotPromise.all([promise])',
		'Promise?.all([promise])',
		'Promise.all?.([promise])',
	],
	invalid: [
		'await Promise.all([promise])',
		'await Promise.all([func()])',
		'await Promise.all([promises[0]])',
		'await Promise.all([await promise])',
		'await Promise.any([promise])',
		'await Promise.race([promise])',
		'Promise.all([somethingMaybeNotPromise])',
	],
});
