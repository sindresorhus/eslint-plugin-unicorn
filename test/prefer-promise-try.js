import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'Promise.try(fn);',
		'new Promise(resolve => resolve(value));',
		'new Promise(resolve => resolve(...values));',
		'new Promise(resolve => resolve(fn));',
		'new Promise(resolve => resolve(new Foo()));',
		'new Promise(resolve => resolve(fn?.()));',
		'new Promise(resolve => resolve(fn(resolve)));',
		'new Promise(resolve => resolve(resolve()));',
		'new Promise(resolve => resolve(fn()), extra);',
		'new Promise((resolve, reject) => resolve(fn()));',
		'new Promise(async resolve => resolve(fn()));',
		'new Promise(function (resolve) { resolve(fn()); });',
		'new Promise(function (resolve) { resolve(this.method()); });',
		'new Promise(function (resolve) { resolve(fn(arguments)); });',
		'new Promise(function * (resolve) { resolve(fn()); });',
		'new Promise(resolve => { setup(); resolve(fn()); });',
		'new Promise(resolve => { resolve(fn()); cleanup(); });',
		'new Promise(resolve => { return resolve(fn()); });',
		'new Promise(resolve => { if (condition) { resolve(fn()); } });',
		'new Promise(resolve => reject(fn()));',
		'new Promise(({resolve}) => resolve(fn()));',
		'new Promise((resolve = defaultResolve) => resolve(fn()));',
		'new NotPromise(resolve => resolve(fn()));',
		'Promise.resolve(value).then(fn);',
		'Promise.resolve().then(fn, onRejected);',
		'Promise.resolve().then(undefined);',
		'Promise.resolve().then(null);',
		'Promise.resolve().then(condition && fn);',
		'Promise.resolve().then(fn());',
		'Promise.resolve().then?.(fn);',
		'Promise.resolve?.().then(fn);',
		'Promise.resolve()["then"](fn);',
		'Promise["resolve"]().then(fn);',
		'const Promise = CustomPromise; new Promise(resolve => resolve(fn()));',
		'const Promise = CustomPromise; Promise.resolve().then(fn);',
		'globalThis.Promise.resolve().then(fn);',
	],
	invalid: [
		'new Promise(resolve => resolve(fn()));',
		'new Promise(resolve => resolve((fn())));',
		'new Promise(resolve => resolve(fn(arg)));',
		'new Promise(resolve => resolve(object.method()));',
		'new Promise(resolve => resolve(object["method"]()));',
		'new Promise(resolve => { resolve(fn()); });',
		'(new Promise(resolve => resolve(fn())))',
		'new (new Promise(resolve => resolve(fn())))();',
		{
			code: 'new Promise<string>(resolve => resolve(fn()));',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'new Promise((resolve: Resolve) => resolve(fn()));',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'new Promise((resolve): void => resolve(fn()));',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'new Promise(<Type>(resolve) => resolve(fn()));',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'new Promise(resolve => resolve(fn<string>()));',
			languageOptions: {parser: parsers.typescript},
		},
		'new Promise(resolve => resolve(/* keep */ fn()));',
		outdent`
			new Promise(resolve => {
				// Keep comment.
				resolve(fn());
			});
		`,
		'Promise.resolve().then(fn);',
		'Promise.resolve().then(object.method);',
		'Promise.resolve().then(() => fn());',
		'const promise = Promise.resolve().then(fn);',
	],
});
