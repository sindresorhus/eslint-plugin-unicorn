import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const createSuggestionError = output => [{
	messageId: 'no-await-in-promise-methods/error',
	suggestions: [
		{
			messageId: 'no-await-in-promise-methods/suggestion',
			output,
		},
	],
}];

test({
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
		{
			code: 'Promise.all([promise, await promise, await promise, promise])',
			suggestion: 'Promise.all([promise, promise, promise, promise])',
		},
		{
			code: 'Promise.all([, await promise])',
			suggestion: 'Promise.all([, promise])',
		},
		{
			code: 'Promise.allSettled([promise, await promise, await promise, promise])',
			suggestion: 'Promise.allSettled([promise, promise, promise, promise])',
		},
		{
			code: 'Promise.any([promise, await promise, await promise, promise])',
			suggestion: 'Promise.any([promise, promise, promise, promise])',
		},
		{
			code: 'Promise.race([promise, await promise, await promise, promise])',
			suggestion: 'Promise.race([promise, promise, promise, promise])',
		},
	].map(({code, suggestion}) => ({code, errors: createSuggestionError(suggestion)})),
});
