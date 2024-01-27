import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Promise.all([promise, promise, promise, promise])',
		'Promise.allSettled([promise, promise, promise, promise])',
		'Promise.any([promise, promise, promise, promise])',
		'Promise.race([promise, promise, promise, promise])',
		'Promise.resolve([await promise])',
		'Promise[all]([await promise])',
		'Promise.all([,])',
	],

	invalid: [
		'Promise.all([promise, await promise, await promise, promise])',
		'Promise.all([, await promise])',
		'Promise.allSettled([promise, await promise, await promise, promise])',
		'Promise.any([promise, await promise, await promise, promise])',
		'Promise.race([promise, await promise, await promise, promise])',
	],
});
