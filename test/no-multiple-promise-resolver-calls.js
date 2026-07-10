import outdent from 'outdent';
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);
const error = {messageId: 'no-multiple-promise-resolver-calls'};

test.snapshot({
	valid: [
		'new Promise(resolve => resolve(value));',
		outdent`
			new Promise((resolve, reject) => {
				if (error) {
					reject(error);
				} else {
					resolve(value);
				}
			});
		`,
		'new Promise((resolve, reject) => condition ? resolve(value) : reject(error));',
		outdent`
			new Promise((resolve, reject) => {
				if (error) {
					reject(error);
					return;
				}

				resolve(value);
			});
		`,
		outdent`
			new Promise(resolve => {
				resolve(value);
				return;
				resolve(otherValue);
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				read((error, value) => {
					if (error) {
						reject(error);
					} else {
						resolve(value);
					}
				});
			});
		`,
		{
			code: 'new Promise<string>((resolve: (value: string) => void, reject: (error: Error) => void) => resolve(value));',
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			const Promise = CustomPromise;
			new Promise(resolve => {
				resolve(value);
				resolve(otherValue);
			});
		`,
		outdent`
			new globalThis.Promise(resolve => {
				resolve(value);
				resolve(otherValue);
			});
		`,
		outdent`
			new CustomPromise(resolve => {
				resolve(value);
				resolve(otherValue);
			});
		`,
		outdent`
			new Promise(resolve => {
				resolve(value);
				resolve(otherValue);
			}, extraArgument);
		`,
		outdent`
			new Promise(function * (resolve) {
				resolve(value);
				resolve(otherValue);
			});
		`,
		outdent`
			new Promise(resolve => {
				resolve = otherResolve;
				resolve(value);
				resolve(otherValue);
			});
		`,
		outdent`
			new Promise(resolve => {
				const finish = resolve;
				finish(value);
				finish(otherValue);
			});
		`,
		outdent`
			new Promise(({resolve}, reject) => {
				resolve(value);
				resolve(otherValue);
				reject.call(undefined, error);
				reject.apply(undefined, [otherError]);
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve(mayThrow());
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve();
				} catch (error) {
					reject(error);
					reject(otherError);
				}
			});
		`,
		outdent`
			new Promise(async (resolve, reject) => {
				try {
					resolve(await getValue());
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve(object.value);
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					if (condition) {
						resolve(value);
					} else {
						mayThrow();
					}
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					try {
						mayThrow();
					} catch {} finally {
						resolve();
					}
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					try {
						mayThrow();
					} finally {
						resolve();
						return;
					}
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					if (condition) {
						mayThrow();
					} else {
						resolve(value);
					}
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				onSuccess(() => resolve(value));
				onFailure(error => reject(error));
			});
		`,
		outdent`
			const executor = (resolve, reject) => {
				resolve(value);
				reject(error);
			};
			new Promise(executor);
		`,
		outdent`
			new Promise(resolve => {
				while (condition) {
					resolve(value);
					break;
				}
			});
		`,
		outdent`
			new Promise(resolve => {
				do {
					resolve(value);
				} while (false);
			});
		`,
		{
			code: outdent`
				new Promise(resolve => {
					do {
						resolve(value);
					} while (false as boolean);
				});
			`,
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			new Promise(resolve => {
				while (false) {
					resolve(value);
				}
			});
		`,
		outdent`
			new Promise(resolve => {
				resolve(value);
				while (false) {
					resolve(otherValue);
				}
			});
		`,
		outdent`
			new Promise(resolve => {
				resolve(value);
				for (; false;) {
					resolve(otherValue);
				}
			});
		`,
		outdent`
			new Promise(resolve => {
				while (false) {
					consume(() => {
						resolve(value);
						resolve(otherValue);
					});
				}
			});
		`,
		'new Promise((resolve, reject = resolve()) => { resolve(); });',
		outdent`
			new Promise(resolveOuter => {
				new Promise((resolveInner, rejectInner = resolveOuter()) => {
					resolveOuter();
				});
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve();
					const value = 1;
					({value: 1});
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve();
					const value = 1;
					value;
					({value});
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve();
					import('missing');
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					import('missing');
				} catch (error) {
					reject(error);
					reject(otherError);
				}
			});
		`,
		outdent`
			new Promise(async (resolve, reject) => {
				try {
					await resolve();
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve();
					missingValue;
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				switch (value) {
					case 1: {
						resolve();
						break;
					}
					default: {
						reject();
					}
				}
			});
		`,
		{
			code: outdent`
				new Promise((resolve, reject) => {
					try {
						resolve();
						const value: Foo = 1;
					} catch (error) {
						reject(error);
					}
				});
			`,
			languageOptions: {parser: parsers.typescript},
		},
		outdent`
			new Promise(resolve => {
				function nested(resolve) {
					resolve(value);
					resolve(otherValue);
				}

				nested(callback);
			});
		`,
		outdent`
			new Promise((resolve, reject, extra) => {
				extra(value);
				extra(otherValue);
			});
		`,
		outdent`
			new Promise(resolve => {
				resolve(value);
				(() => resolve(otherValue))();
			});
		`,
	],
	invalid: [
		outdent`
			new Promise((resolve, reject) => {
				resolve(value);
				reject(error);
			});
		`,
		outdent`
			new Promise(resolve => {
				if (condition) {
					resolve(value);
				}

				resolve(otherValue);
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				if (condition) {
					resolve(value);
				} else {
					reject(error);
				}

				resolve(otherValue);
			});
		`,
		'new Promise((resolve, reject) => { condition ? resolve(value) : reject(error); resolve(otherValue); });',
		'new Promise((resolve, reject) => { condition && resolve(value); reject(error); });',
		outdent`
			new Promise((resolve, reject) => {
				read((error, value) => {
					if (error) {
						reject(error);
					}

					resolve(value);
				});
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					reject(error);
				} finally {
					resolve(value);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve(value);
					mayThrow();
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve();
					object.value;
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve();
					new Constructor();
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				consume(function * () {
					try {
						resolve();
						yield value;
					} catch (error) {
						reject(error);
					}
				});
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					if (condition) {
						resolve(value);
						mayThrow();
					} else {
						otherMayThrow();
						resolve(otherValue);
					}
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					if (condition) {
						otherMayThrow();
						resolve(otherValue);
					} else {
						resolve(value);
						mayThrow();
					}
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve(value);
					throw error;
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve(mayThrow());
				} catch (error) {
					reject(error);
				}

				resolve(fallbackValue);
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve(mayThrow());
				} catch (error) {
					reject(error);
					reject(otherError);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					resolve(firstValue);
					resolve(mayThrow());
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				try {
					if (condition) {
						resolve(firstValue);
					}

					resolve(mayThrow());
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise(resolve => {
				while (condition) {
					resolve(value);
				}
			});
		`,
		outdent`
			new Promise(resolve => {
				for (const value of values) {
					resolve(value);
				}

				resolve(fallbackValue);
			});
		`,
		outdent`
			new Promise(resolveOuter => {
				new Promise(resolveInner => {
					resolveOuter(value);
					resolveInner(innerValue);
					resolveOuter(otherValue);
				});
			});
		`,
		outdent`
			new Promise(resolveOuter => {
				new Promise(resolveInner => {
					resolveInner(innerValue);
					resolveOuter(value);
					resolveInner(otherInnerValue);
				});
			});
		`,
		outdent`
			new Promise(async (resolve, reject) => {
				resolve(await getValue());
				reject(error);
			});
		`,
		outdent`
			new Promise(resolve => {
				resolve?.(value);
				resolve(otherValue);
			});
		`,
		{
			code: 'new Promise<string>((resolve: (value: string) => void) => { resolve(value); resolve(otherValue); });',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'new Promise((resolve: (value?: unknown) => void) => { resolve!(); (resolve as typeof resolve)(); });',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'new Promise(((resolve: (value?: unknown) => void) => { resolve(); resolve(); }) as Executor);',
			languageOptions: {parser: parsers.typescript},
		},
		{
			code: 'new Promise((<Type>(resolve: (value?: unknown) => void) => { resolve(); resolve(); })<unknown>);',
			languageOptions: {parser: parsers.typescript},
		},
		'new Promise((resolve, reject, extra = resolve()) => { resolve(); });',
		'new Promise((resolve, reject) => { resolve = otherResolve; reject(); reject(); });',
		outdent`
			new Promise(function (resolve, reject) {
				resolve(value);
				reject(error);
			});
		`,
		outdent`
			new Promise(async (resolve, reject) => {
				try {
					resolve();
					await import('missing');
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise(async (resolve, reject) => {
				try {
					resolve();
					await value;
				} catch (error) {
					reject(error);
				}
			});
		`,
		outdent`
			new Promise((resolve, reject) => {
				switch (value) {
					case 1: {
						resolve();
					}
					default: {
						reject();
					}
				}
			});
		`,
	],
});

test({
	valid: [],
	invalid: [
		{
			code: 'new Promise((finish, fail) => { finish(); fail(); finish(); });',
			errors: [error, error],
		},
		{
			code: 'new Promise(resolve => { resolve(); resolve(); });',
			errors: [error],
		},
		{
			code: outdent`
				new Promise((resolve, reject) => {
					if (error) {
						resolve();
					}

					if (!error) {
						reject();
					}
				});
			`,
			errors: [error],
		},
		{
			code: 'new Promise((resolve, reject) => { if (resolve()) { reject(); } });',
			errors: [error],
		},
		{
			code: outdent`
				new Promise((resolve, reject) => {
					while (condition) {
						try {
							resolve(mayThrow());
						} catch (error) {
							reject(error);
						}
					}
				});
			`,
			errors: [error, error],
		},
		{
			code: outdent`
				new Promise((resolve, reject) => {
					resolve(firstValue);

					try {
						resolve(2);
					} catch (error) {
						reject(error);
					}
				});
			`,
			errors: [error],
		},
		{
			code: outdent`
				new Promise((resolve, reject) => {
					try {
						resolve();
						reject();
					} catch {
						resolve();
					}
				});
			`,
			errors: [error],
		},
		{
			code: outdent`
				new Promise((resolve, reject) => {
					try {
						resolve();
						reject(mayThrow());
					} catch {
						resolve();
					}
				});
			`,
			errors: [error, error],
		},
		{
			code: outdent`
				new Promise((resolve, reject) => {
					resolve(1);

					try {
						try {
							mayThrow();
						} catch {}

						resolve(2);
					} catch (error) {
						reject(error);
					}
				});
			`,
			errors: [error],
		},
		{
			code: outdent`
				new Promise((resolve, reject) => {
					resolve(1);

					try {
						try {
							mayThrow();
						} finally {}

						resolve(2);
					} catch (error) {
						reject(error);
					}
				});
			`,
			errors: [error, error],
		},
		{
			code: outdent`
				new Promise((resolve, reject) => {
					try {
						try {
							mayThrow();
						} finally {
							resolve();
						}
					} catch (error) {
						reject(error);
					}
				});
			`,
			errors: [error],
		},
		{
			code: outdent`
				new Promise((resolve, reject) => {
					try {
						try {
							mayThrow();
						} catch (error) {
							resolve(error);
							throw error;
						}
					} catch (error) {
						reject(error);
					}
				});
			`,
			errors: [error],
		},
		{
			code: outdent`
				new Promise((resolve, reject) => {
					try {
						resolve(mayThrow());
					} finally {
						reject(error);
					}
				});
			`,
			errors: [error],
		},
	],
});
