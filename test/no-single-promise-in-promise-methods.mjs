import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const error = {
	messageId: 'no-single-promise-in-promise-methods/error',
};

test({
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
	],

	invalid: [
		{
			code: 'await Promise.all([promise])',
			errors: [error],
			output: 'await promise',
		},
		{
			code: 'await Promise.all([func()])',
			errors: [error],
			output: 'await func()',
		},
		{
			code: 'await Promise.all([promises[0]])',
			errors: [error],
			output: 'await promises[0]',
		},
		{
			code: 'await Promise.all([await promise])',
			errors: [error],
			output: 'await promise',
		},
		{
			code: 'await Promise.any([promise])',
			errors: [error],
			output: 'await promise',
		},
		{
			code: 'await Promise.race([promise])',
			errors: [error],
			output: 'await promise',
		},
		{
			code: 'Promise.all([somethingMaybeNotPromise])',
			errors: [
				{
					...error,
					suggestions: [
						{
							messageId: 'no-single-promise-in-promise-methods/suggestion-1',
							output: 'somethingMaybeNotPromise',
						},
						{
							messageId: 'no-single-promise-in-promise-methods/suggestion-2',
							output: 'Promise.resolve(somethingMaybeNotPromise)',
						},
					],
				},
			],
		},
	],
});
