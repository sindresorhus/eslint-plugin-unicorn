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
		// Delegate yield expressions
		...['resolve', 'reject'].map(fn => outdent`
			async function * foo() {
				yield* Promise.${fn}(bar);
			}
		`),
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
		{
			code: outdent`
				async function * foo() {
					return Promise.resolve(bar);
				}
			`,
			errors: [returnResolveError],
			output: outdent`
				async function * foo() {
					return bar;
				}
			`,
		},
		{
			code: outdent`
				(async function*() {
					return Promise.resolve(bar);
				});
			`,
			errors: [returnResolveError],
			output: outdent`
				(async function*() {
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
		{
			code: outdent`
				async function * foo() {
					return Promise.reject(bar);
				}
			`,
			errors: [returnRejectError],
			output: outdent`
				async function * foo() {
					throw bar;
				}
			`,
		},
		{
			code: outdent`
				(async function*() {
					return Promise.reject(bar);
				});
			`,
			errors: [returnRejectError],
			output: outdent`
				(async function*() {
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
		// No arguments
		{
			code: 'async () => Promise.resolve();',
			errors: [returnResolveError],
			output: 'async () => {};',
		},
		{
			code: outdent`
				async function foo() {
					return Promise.resolve();
				}
			`,
			errors: [returnResolveError],
			output: outdent`
				async function foo() {
					return ;
				}
			`,
		},
		{
			code: 'async () => Promise.reject();',
			errors: [returnRejectError],
			output: 'async () => { throw undefined; };',
		},
		{
			code: outdent`
				async function foo() {
					return Promise.reject();
				}
			`,
			errors: [returnRejectError],
			output: outdent`
				async function foo() {
					throw undefined;
				}
			`,
		},
		{
			code: outdent`
				async function * foo() {
					yield Promise.resolve();
				}
			`,
			errors: [yieldResolveError],
			output: outdent`
				async function * foo() {
					yield undefined;
				}
			`,
		},
		// Multiple arguments
		{
			code: 'async () => Promise.resolve(bar, baz);',
			errors: [returnResolveError],
		},
		{
			code: 'async () => Promise.reject(bar, baz);',
			errors: [returnRejectError],
		},
		// Sequence expressions
		{
			code: outdent`
				async function * foo() {
					yield Promise.resolve((bar, baz));
				}
			`,
			errors: [yieldResolveError],
			output: outdent`
				async function * foo() {
					yield (bar, baz);
				}
			`,
		},
		{
			code: 'async () => Promise.resolve((bar, baz))',
			errors: [returnResolveError],
			output: 'async () => (bar, baz)',
		},
		// Arrow function returning an object
		{
			code: 'async () => Promise.resolve({})',
			errors: [returnResolveError],
			output: 'async () => ({})',
		},
		// Try statements
		{
			code: outdent`
				async function foo() {
					try {
						return Promise.resolve(1);
					} catch {}
				}
			`,
			errors: [returnResolveError],
			output: outdent`
				async function foo() {
					try {
						return 1;
					} catch {}
				}
			`,
		},
		{
			code: outdent`
				async function foo() {
					try {
						return Promise.reject(1);
					} catch {}
				}
			`,
			errors: [returnRejectError],
		},
		// Spread arguments
		{
			code: 'async () => Promise.resolve(...bar);',
			errors: [returnResolveError],
		},
		{
			code: 'async () => Promise.reject(...bar);',
			errors: [returnRejectError],
		},
	],
});
