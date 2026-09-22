import test from 'ava';
import {Linter} from 'eslint';
import outdent from 'outdent';
import plugin from '../index.js';
import {getTester, parsers} from './utils/test.js';

const {test: ruleTest} = getTester(import.meta);
const resolveError = {messageId: 'resolve'};
const rejectError = {messageId: 'reject'};

ruleTest({
	valid: [
		'Promise.resolve(value);',
		'Promise.reject(error);',
		'new Promise(resolve => resolve(fn()));',
		'new Promise((resolve, reject) => reject(fn()));',
		'new Promise(resolve => resolve(new Error()));',
		'new Promise(resolve => resolve(object.value));',
		'new Promise(resolve => resolve(value + 1));',
		'new Promise(resolve => resolve(value, sideEffect()));',
		'new Promise(resolve => resolve(...values));',
		'new Promise(resolve => resolve?.(value));',
		'new Promise(resolve => { setup(); resolve(value); });',
		'new Promise(resolve => { resolve(value); cleanup(); });',
		'new Promise(resolve => { return resolve(value); });',
		'new Promise(resolve => condition && resolve(value));',
		'new Promise(resolve => reject(value));',
		'new Promise((resolve, reject) => resolve(reject));',
		'new Promise(resolve => resolve(resolve));',
		'new Promise(function (resolve) { resolve(arguments); });',
		'new Promise(function executor(resolve) { resolve(executor); });',
		'new Promise((resolve = fallback) => resolve(value));',
		'new Promise((...resolvers) => resolvers[0](value));',
		'new Promise(async resolve => resolve(value));',
		'new Promise(function * (resolve) { resolve(value); });',
		'new Promise(resolve => resolve(value), extra);',
		'new OtherPromise(resolve => resolve(value));',
		'const Promise = OtherPromise; new Promise(resolve => resolve(value));',
		{code: 'new Promise(function (resolve, resolve) { resolve(value); });', languageOptions: {sourceType: 'script'}},
		{code: 'new Promise(function (this: object, resolve) { resolve(value); });', languageOptions: {parser: parsers.typescript}},
	],
	invalid: [
		{code: 'new Promise(resolve => resolve(value));', errors: [resolveError], output: 'Promise.resolve(value);'},
		{code: 'function enclosing() { return new Promise(resolve => resolve(arguments)); }', errors: [resolveError], output: 'function enclosing() { return Promise.resolve(arguments); }'},
		{code: 'new Promise(resolve => resolve());', errors: [resolveError], output: 'Promise.resolve();'},
		{code: 'new Promise(resolve => { resolve(1); });', errors: [resolveError], output: 'Promise.resolve(1);'},
		{code: 'new Promise((resolve, reject) => reject(error));', errors: [rejectError], output: 'Promise.reject(error);'},
		{code: 'new Promise((reject, resolve) => resolve(error));', errors: [rejectError], output: 'Promise.reject(error);'},
		{code: 'new Promise((unused, reject) => reject());', errors: [rejectError], output: 'Promise.reject();'},
		{code: 'new Promise(function (resolve) { resolve(value); });', errors: [resolveError], output: 'Promise.resolve(value);'},
		{code: 'new Promise((resolve, reject) => resolve(false));', errors: [resolveError], output: 'Promise.resolve(false);'},
		{code: '(new Promise(resolve => resolve(value))).then(callback);', errors: [resolveError], output: '(Promise.resolve(value)).then(callback);'},
		{code: 'const value = new Promise((unused, reject) => reject(null));', errors: [rejectError], output: 'const value = Promise.reject(null);'},
		{code: 'new Promise(resolve => resolve(`value`));', errors: [resolveError], output: 'Promise.resolve(`value`);'},
		{code: 'new Promise(resolve => resolve(/* keep */ value));', errors: [resolveError]},
		{code: 'new Promise((resolve /* keep */) => resolve(value));', errors: [resolveError]},
		{
			code: outdent`
				new Promise(resolve => {
					// Keep comment.
					resolve(value);
				});
			`, errors: [resolveError],
		},
		{code: 'new Promise((resolve: Resolver) => resolve(value));', languageOptions: {parser: parsers.typescript}, errors: [resolveError]},
		{
			code: 'new Promise<string>(resolve => resolve(value));', languageOptions: {parser: parsers.typescript}, errors: [resolveError],
		},
		{
			code: 'new Promise<Promise<number>>(resolve => resolve(value));', languageOptions: {parser: parsers.typescript}, errors: [resolveError],
		},
		{
			code: 'new Promise<string>((unused, reject) => reject(error));', languageOptions: {parser: parsers.typescript}, errors: [rejectError], output: 'Promise.reject<string>(error);',
		},
		{code: 'new Promise<void>(resolve => resolve());', languageOptions: {parser: parsers.typescript}, errors: [resolveError]},
	],
});

test('does not duplicate prefer-promise-try reports', t => {
	const linter = new Linter();
	const messages = linter.verify('new Promise(resolve => resolve(fn()));', {
		plugins: {unicorn: plugin},
		rules: {
			'unicorn/prefer-promise-static-methods': 'error',
			'unicorn/prefer-promise-try': 'error',
		},
	});

	t.deepEqual(messages.map(({ruleId}) => ruleId), ['unicorn/prefer-promise-try']);
});
