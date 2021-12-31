import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

const createError = (type, messageId) => ({messageId, data: {type}});

const returnResolveError = createError('return', 'resolve');
const returnRejectError = createError('return', 'reject');
const yieldResolveError = createError('yield', 'resolve');
const yieldRejectError = createError('yield', 'reject');

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
		// Promise#then/catch/finally
		'promise.then(() => foo).catch(() => bar).finally(() => baz)',
		'promise.then(() => foo, () => bar).finally(() => baz)',
		'promise.then(x, y, () => Promise.resolve(foo))',
		'promise.catch(x, () => Promise.resolve(foo))',
		'promise.finally(x, () => Promise.resolve(foo))',
		'promise[then](() => Promise.resolve(foo))',
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
					return;
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
					yield;
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
		// Yield not in an ExpressionStatement
		{
			code: outdent`
				async function * foo() {
					const baz = yield Promise.resolve(bar);
				}
			`,
			errors: [yieldResolveError],
			output: outdent`
				async function * foo() {
					const baz = yield bar;
				}
			`,
		},
		{
			code: outdent`
				async function * foo() {
					const baz = yield Promise.reject(bar);
				}
			`,
			errors: [yieldRejectError],
		},
		// Parenthesized Promise.resolve/reject
		{
			code: 'async () => (Promise.resolve(bar));',
			output: 'async () => (bar);',
			errors: [returnResolveError],
		},
		...[
			'async () => (Promise.reject(bar));',
			'async () => ((Promise.reject(bar)));',
		].map(code => ({
			code,
			output: 'async () => { throw bar; };',
			errors: [returnRejectError],
		})),
		...[
			'(yield Promise.reject(bar));',
			'((yield Promise.reject(bar)));',
		].map(code => ({
			code: outdent`
				async function * foo() {
					${code}
				}
			`,
			output: outdent`
				async function * foo() {
					throw bar;
				}
			`,
			errors: [yieldRejectError],
		})),
		// Promise#then/catch/finally callbacks returning Promise.resolve/reject
		...['then', 'catch', 'finally'].flatMap(fn => [
			{
				code: `promise.${fn}(() => Promise.resolve(bar))`,
				errors: [returnResolveError],
				output: `promise.${fn}(() => bar)`,
			},
			{
				code: `promise.${fn}(() => { return Promise.resolve(bar); })`,
				errors: [returnResolveError],
				output: `promise.${fn}(() => { return bar; })`,
			},
			{
				code: `promise.${fn}(async () => Promise.reject(bar))`,
				errors: [returnRejectError],
				output: `promise.${fn}(async () => { throw bar; })`,
			},
			{
				code: `promise.${fn}(async () => { return Promise.reject(bar); })`,
				errors: [returnRejectError],
				output: `promise.${fn}(async () => { throw bar; })`,
			},
		]),
		{
			code: 'promise.then(() => {}, () => Promise.resolve(bar))',
			errors: [returnResolveError],
			output: 'promise.then(() => {}, () => bar)',
		},
		{
			code: 'promise.then(() => Promise.resolve(bar), () => Promise.resolve(baz))',
			errors: [returnResolveError, returnResolveError],
			output: 'promise.then(() => bar, () => baz)',
		},
		{
			code: 'promise.then(() => {}, () => { return Promise.resolve(bar); })',
			errors: [returnResolveError],
			output: 'promise.then(() => {}, () => { return bar; })',
		},
		{
			code: 'promise.then(() => {}, async () => Promise.reject(bar))',
			errors: [returnRejectError],
			output: 'promise.then(() => {}, async () => { throw bar; })',
		},
		{
			code: 'promise.then(() => {}, async () => { return Promise.reject(bar); })',
			errors: [returnRejectError],
			output: 'promise.then(() => {}, async () => { throw bar; })',
		},
	],
});
