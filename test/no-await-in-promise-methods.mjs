import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Promise.all([promise1, promise2, promise3, promise4])',
		'Promise.allSettled([promise1, promise2, promise3, promise4])',
		'Promise.any([promise1, promise2, promise3, promise4])',
		'Promise.race([promise1, promise2, promise3, promise4])',
		'Promise.resolve([await promise])',
		'Promise.all([,])',
		'Promise[all]([await promise])',
		'Promise.all?.([await promise])',
		'Promise?.all([await promise])',
		'Promise.notListedMethod([await promise])',
		'NotPromise.all([await promise])',
	],

	invalid: [
		'Promise.all([promise1, await promise2, await promise3, promise4])',
		'Promise.all([, await promise])',
		'Promise.allSettled([promise1, await promise2, await promise3, promise4])',
		'Promise.any([promise1, await promise2, await promise3, promise4])',
		'Promise.race([promise1, await promise2, await promise4, promise4])',
	],
});
