import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

const error = {messageId: 'prefer-promise-with-resolvers'};

test({
	valid: [
		'new Promise(resolve => resolve(value));',
		'new Promise((resolve, reject) => readFile(path, (error, result) => { if (error) { reject(error); } else { resolve(result); } }));',
		outdent`
			const promise = new Promise(resolve => {
				functionThatPotentiallyThrows();
				resolve();
			});
		`,
		outdent`
			let resolve;
			const promise = new Promise(resolve_ => {
				Object.assign(dialog, {show: true, resolve});
			});
		`,
		outdent`
			const deferred = {};
			const promise = new Promise(resolve => {
				deferred.resolve = resolve;
			});
		`,
		outdent`
			let resolve;
			const promise = new Promise(async resolve_ => {
				resolve = resolve_;
			});
		`,
		outdent`
			let resolve;
			const promise = new Promise(function * (resolve_) {
				resolve = resolve_;
			});
		`,
		outdent`
			let resolve;
			const promise = new Promise(resolve_ => resolve = resolve_);
		`,
		outdent`
			let resolve;
			const promise = new NotPromise(resolve_ => {
				resolve = resolve_;
			});
		`,
		outdent`
			let resolve;
			const promise = new globalThis.Promise(resolve_ => {
				resolve = resolve_;
			});
		`,
		outdent`
			const Promise = CustomPromise;
			let resolve;
			const promise = new Promise(resolve_ => {
				resolve = resolve_;
			});
		`,
		outdent`
			let resolve;
			const promise = new Promise(resolve => {
				resolve = resolve;
			});
		`,
		outdent`
			let resolve;
			const promise = new Promise((resolve, reject) => {
				resolve = reject;
			});
		`,
	],
	invalid: [
		{
			code: outdent`
				let resolve;
				const promise = new Promise(resolve_ => {
					resolve = resolve_;
				});
			`,
			errors: [error],
			output: 'const {promise, resolve} = Promise.withResolvers();',
		},
		{
			code: outdent`
				let resolve, reject;
				const promise = new Promise((resolve_, reject_) => {
					resolve = resolve_;
					reject = reject_;
				});
			`,
			errors: [error],
			output: 'const {promise, resolve, reject} = Promise.withResolvers();',
		},
		{
			code: outdent`
				let fulfill, fail;
				const deferredPromise = new Promise((resolve, reject) => {
					fulfill = resolve;
					fail = reject;
				});
			`,
			errors: [error],
			output: 'const {promise: deferredPromise, resolve: fulfill, reject: fail} = Promise.withResolvers();',
		},
		{
			code: outdent`
				let fulfill;
				let fail;
				const deferredPromise = new Promise((resolve, reject) => {
					fail = reject;
					fulfill = resolve;
				});
			`,
			errors: [error],
			output: 'const {promise: deferredPromise, resolve: fulfill, reject: fail} = Promise.withResolvers();',
		},
		{
			code: outdent`
				let resolve;
				const promise = new Promise<string>(resolve_ => {
					resolve = resolve_;
				});
			`,
			languageOptions: {parser: parsers.typescript},
			errors: [error],
			output: 'const {promise, resolve} = Promise.withResolvers<string>();',
		},
		{
			code: outdent`
				let resolve;
				const promise = new Promise((resolve_: (value: string) => void) => {
					resolve = resolve_;
				});
			`,
			languageOptions: {parser: parsers.typescript},
			errors: [error],
		},
		{
			code: outdent`
				let reject;
				const promise = new Promise((resolve, reject_) => {
					reject = reject_;
				});
			`,
			errors: [error],
			output: 'const {promise, reject} = Promise.withResolvers();',
		},
		{
			code: outdent`
				let resolve;
				foo();
				const promise = new Promise(resolve_ => {
					resolve = resolve_;
				});
			`,
			errors: [error],
		},
		{
			code: outdent`
				let resolve; // Keep declaration comment.
				const promise = new Promise(resolve_ => {
					resolve = resolve_;
				});
			`,
			errors: [error],
		},
		{
			code: outdent`
				let resolve;
				const promise = new Promise(resolve_ => {
					// Keep executor comment.
					resolve = resolve_;
				});
			`,
			errors: [error],
		},
		{
			code: outdent`
				let resolve: (value: string) => void;
				const promise = new Promise<string>(resolve_ => {
					resolve = resolve_;
				});
			`,
			languageOptions: {parser: parsers.typescript},
			errors: [error],
		},
		{
			code: outdent`
				let resolve;
				const promise = new Promise(resolve_ => {
					resolve = resolve_;
				});
				resolve = otherResolve;
			`,
			errors: [error],
		},
		{
			code: outdent`
				let resolve;
				export const promise = new Promise(resolve_ => {
					resolve = resolve_;
				});
			`,
			errors: [error],
		},
	],
});
