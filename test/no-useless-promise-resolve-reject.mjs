import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const createError = messageId => ({messageId});
const returnResolveError = createError('return-resolve');
const returnRejectError = createError('return-reject');
const yieldResolveError = createError('yield-resolve');
const yieldRejectError = createError('yield-reject');

test({
	valid: [
		// Async functions returning normal values/throwing values
		'async () => bar;',
		...['return', 'throw'].flatMap(keyword => [
			outdent`
				async () => {
					${keyword} bar;
				};
			`,
			outdent`
				async function foo() {
					${keyword} bar;
				}
			`,
			outdent`
				(async function() {
					${keyword} bar;
				});
			`,
		]),
		// Sync function returning Promise.resolve/reject
		...['resolve, reject'].flatMap(fn => [
			`() => Promise.${fn}(bar);`,
			outdent`
				() => {
					return Promise.${fn}(bar);
				};
			`,
			outdent`
				function foo() {
					return Promise.${fn}(bar);
				};
			`,
			outdent`
				(function() {
					return Promise.${fn}(bar);
				});
			`,
		]),
		// Sync generator yielding Promise.resolve/reject
		...['resolve', 'reject'].flatMap(fn => [
			outdent`
				function * foo() {
					yield Promise.${fn}(bar);
				}
			`,
			outdent`
				(function * () {
					yield Promise.${fn}(bar);
				})
			`,
		]),
		// Sync function nested in async function
		outdent`
			async function foo() {
				function bar() {
					return Promise.resolve(baz);
				}
			}
		`,
	],
	invalid: [
		{
			code: outdent`
				const main = async foo => {
					if (foo > 4) {
						return Promise.reject(new Error('🤪'));
					}

					return Promise.resolve(result);
				};
			`,
			errors: [returnRejectError, returnResolveError],
			output: outdent`
				const main = async foo => {
					if (foo > 4) {
						throw new Error('🤪');
					}

					return result;
				};
			`,
		},
		// Async function returning Promise.resolve
		{
			code: 'async () => Promise.resolve(bar);',
			errors: [returnResolveError],
			output: 'async () => bar;',
		},
		{
			code: outdent`
				async () => {
					return Promise.resolve(bar);
				};
			`,
			errors: [returnResolveError],
			output: outdent`
				async () => {
					return bar;
				};
			`,
		},
		{
			code: outdent`
				async function foo() {
					return Promise.resolve(bar);
				}
			`,
			errors: [returnResolveError],
			output: outdent`
				async function foo() {
					return bar;
				}
			`,
		},
		{
			code: outdent`
				(async function() {
					return Promise.resolve(bar);
				});
			`,
			errors: [returnResolveError],
			output: outdent`
				(async function() {
					return bar;
				});
			`,
		},
		// Async function returning Promise.reject
		{
			code: 'async () => Promise.reject(bar);',
			errors: [returnRejectError],
			output: 'async () => { throw bar; };',
		},
		{
			code: outdent`
				async () => {
					return Promise.reject(bar);
				};
			`,
			errors: [returnRejectError],
			output: outdent`
				async () => {
					throw bar;
				};
			`,
		},
		{
			code: outdent`
				async function foo() {
					return Promise.reject(bar);
				}
			`,
			errors: [returnRejectError],
			output: outdent`
				async function foo() {
					throw bar;
				}
			`,
		},
		{
			code: outdent`
				(async function() {
					return Promise.reject(bar);
				});
			`,
			errors: [returnRejectError],
			output: outdent`
				(async function() {
					throw bar;
				});
			`,
		},
		// Async generator yielding Promise.resolve
		{
			code: outdent`
				async function * foo() {
					yield Promise.resolve(bar);
				}
			`,
			errors: [yieldResolveError],
			output: outdent`
				async function * foo() {
					yield bar;
				}
			`,
		},
		{
			code: outdent`
				(async function * () {
					yield Promise.resolve(bar);
				});
			`,
			errors: [yieldResolveError],
			output: outdent`
				(async function * () {
					yield bar;
				});
			`,
		},
		// Async generator yielding Promise.reject
		{
			code: outdent`
				async function * foo() {
					yield Promise.reject(bar);
				}
			`,
			errors: [yieldRejectError],
			output: outdent`
				async function * foo() {
					throw bar;
				}
			`,
		},
		{
			code: outdent`
				(async function * () {
					yield Promise.reject(bar);
				});
			`,
			errors: [yieldRejectError],
			output: outdent`
				(async function * () {
					throw bar;
				});
			`,
		},
		// Multiple/no parameters
		...['resolve', 'reject'].flatMap(fn => [
			{
				code: `async () => Promise.${fn}();`,
				errors: [createError(`return-${fn}`)],
			},
			{
				code: outdent`
					async function * foo() {
						yield Promise.${fn}();
					}
				`,
				errors: [createError(`yield-${fn}`)],
			},
		]),
		// Sequence expressions
		{
			code: outdent`
				async function * f() {
					yield Promise.resolve((bar, baz));
				}
			`,
			errors: [yieldResolveError],
			output: outdent`
				async function * f() {
					yield (bar, baz);
				}
			`,
		},
	],
});
