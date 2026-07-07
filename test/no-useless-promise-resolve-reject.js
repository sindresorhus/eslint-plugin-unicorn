import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

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
		...['resolve', 'reject'].flatMap(method => [
			`() => Promise.${method}(bar);`,
			outdent`
				() => {
					return Promise.${method}(bar);
				};
			`,
			outdent`
				function foo() {
					return Promise.${method}(bar);
				};
			`,
			outdent`
				(function() {
					return Promise.${method}(bar);
				});
			`,
		]),
		// Sync generator yielding Promise.resolve/reject
		...['resolve', 'reject'].flatMap(method => [
			outdent`
				function * foo() {
					yield Promise.${method}(bar);
				}
			`,
			outdent`
				(function * () {
					yield Promise.${method}(bar);
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
		// Awaited calls that are not returned/yielded
		outdent`
			async function foo() {
				const value = await Promise.resolve(bar);
			}
		`,
		outdent`
			async function foo() {
				await Promise.reject(error);
			}
		`,
		// Delegate yield expressions
		...['resolve', 'reject'].map(method => outdent`
			async function * foo() {
				yield* Promise.${method}(bar);
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
				async function foo() {
					return await Promise.resolve(foo());
				}
			`,
			errors: [returnResolveError],
			output: outdent`
				async function foo() {
					return await foo();
				}
			`,
		},
		{
			code: outdent`
				async function foo() {
					return await Promise.resolve(/* keep */ foo());
				}
			`,
			errors: [returnResolveError],
		},
		{
			code: 'async () => await (Promise.resolve(foo) /* keep */)',
			errors: [returnResolveError],
		},
		{
			code: 'async () => await /* keep */ Promise.resolve(foo)',
			errors: [returnResolveError],
			output: 'async () => await /* keep */ foo',
		},
		{
			code: 'async () => await Promise.resolve(foo + bar)',
			errors: [returnResolveError],
			output: 'async () => await (foo + bar)',
		},
		{
			code: outdent`
				async function foo(): Promise<number> {
					return await Promise.resolve(42);
				}
			`,
			languageOptions: {parser: parsers.typescript},
			errors: [returnResolveError],
			output: outdent`
				async function foo(): Promise<number> {
					return await 42;
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
				async function foo() {
					return await Promise.reject(error);
				}
			`,
			errors: [returnRejectError],
			output: outdent`
				async function foo() {
					throw error;
				}
			`,
		},
		{
			code: 'async () => await Promise.reject(error)',
			errors: [returnRejectError],
			output: 'async () => { throw error; }',
		},
		{
			code: outdent`
				async function foo() {
					return await Promise.reject(/* keep */ error);
				}
			`,
			errors: [returnRejectError],
		},
		{
			code: 'async () => await /* keep */ Promise.reject(error)',
			errors: [returnRejectError],
		},
		{
			code: 'async () => (await Promise.reject(error) /* keep */)',
			errors: [returnRejectError],
		},
		{
			code: outdent`
				async function foo() {
					return /* keep */ await Promise.reject(error);
				}
			`,
			errors: [returnRejectError],
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
		{
			code: outdent`
				async function * foo() {
					yield await Promise.resolve(foo + bar);
				}
			`,
			errors: [yieldResolveError],
			output: outdent`
				async function * foo() {
					yield await (foo + bar);
				}
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
		{
			code: outdent`
				async function * foo() {
					yield await Promise.reject(error);
				}
			`,
			errors: [yieldRejectError],
			output: outdent`
				async function * foo() {
					throw error;
				}
			`,
		},
		{
			code: outdent`
				async function * foo() {
					yield /* keep */ Promise.reject(error);
				}
			`,
			errors: [yieldRejectError],
		},
		{
			code: outdent`
				async function * foo() {
					(yield Promise.reject(error) /* keep */);
				}
			`,
			errors: [yieldRejectError],
		},
		{
			code: outdent`
				async function * foo() {
					(/* keep */ yield Promise.reject(error));
				}
			`,
			errors: [yieldRejectError],
		},
		// No arguments
		{
			code: 'async () => Promise.resolve();',
			errors: [returnResolveError],
			output: 'async () => {};',
		},
		{
			code: 'async () => await Promise.resolve();',
			errors: [returnResolveError],
			output: 'async () => await undefined;',
		},
		{
			code: 'async () => await Promise.reject();',
			errors: [returnRejectError],
			output: 'async () => { throw undefined; };',
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
		{
			code: 'async () => await Promise.resolve(bar, baz);',
			errors: [returnResolveError],
		},
		{
			code: 'async () => await Promise.reject(bar, baz);',
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
						return await Promise.resolve(bar);
					} catch {}
				}
			`,
			errors: [returnResolveError],
			output: outdent`
				async function foo() {
					try {
						return await bar;
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
		{
			code: outdent`
				async function foo() {
					try {
						return await Promise.reject(error);
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
			code: 'async () => await Promise.resolve(...bar);',
			errors: [returnResolveError],
		},
		{
			code: 'async () => await Promise.reject(...bar);',
			errors: [returnRejectError],
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
		...['then', 'catch', 'finally'].flatMap(method => [
			{
				code: `promise.${method}(() => Promise.resolve(bar))`,
				errors: [returnResolveError],
				output: `promise.${method}(() => bar)`,
			},
			{
				code: `promise.${method}(() => { return Promise.resolve(bar); })`,
				errors: [returnResolveError],
				output: `promise.${method}(() => { return bar; })`,
			},
			{
				code: `promise.${method}(() => Promise.reject(bar))`,
				errors: [returnRejectError],
				output: `promise.${method}(() => { throw bar; })`,
			},
			{
				code: `promise.${method}(() => { return Promise.reject(bar); })`,
				errors: [returnRejectError],
				output: `promise.${method}(() => { throw bar; })`,
			},
		]),
		{
			code: 'promise.then(async () => await Promise.resolve(foo + bar))',
			errors: [returnResolveError],
			output: 'promise.then(async () => await (foo + bar))',
		},
		{
			code: 'promise.catch(async () => await Promise.reject(bar))',
			errors: [returnRejectError],
			output: 'promise.catch(async () => { throw bar; })',
		},
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
			code: 'promise.then(() => {}, () => Promise.reject(bar))',
			errors: [returnRejectError],
			output: 'promise.then(() => {}, () => { throw bar; })',
		},
		{
			code: 'promise.then(() => {}, () => { return Promise.reject(bar); })',
			errors: [returnRejectError],
			output: 'promise.then(() => {}, () => { throw bar; })',
		},
	],
});
