import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Throw statement not exists
		'try {} finally {}',
		'try {} catch {}',
		'try {} catch (oldError) {}',
		// Rethrow old error itself
		'try {} catch (oldError) { throw oldError; }',
		// Specify old error to cause
		outdent`
			try {} catch (oldError) {
				throw new Error('oops', {cause: oldError});
			}
		`,
		outdent`
			try {} catch (oldError) {
				const error = new Error('oops', {cause: oldError});
				throw oldError;
			}
		`,
		outdent`
			try {} catch (oldError) {
				const error = new Error('oops', {cause: oldError});
				throw error;
			}
		`,
		outdent`
			try {

			} catch {
				try {

				} catch (oldError) {
					throw new Error('oops', {cause:oldError});
				}
			}
		`,
		outdent`
			try {

			} catch (oldError1) {
				throw new Error(oldError1, {cause:oldError1});
				try {

				} catch (oldError2) {
					throw new Error(oldError2, {cause:oldError2});
				}
			}
		`,
		outdent`
			try {} catch (oldError) {
				let error;
				error = new Error('oops', {cause: oldError});
				throw error;
			}
		`,
		outdent`
			try {} catch (oldError) {
				let error;
				if (1 + 1 >= 2) {
					error = new Error('oops', {cause: oldError});
				} else {
					error = new Error('oops', {cause: oldError});
				}
				throw error;
			}
		`,
		// Specify old error to CustomError's cause
		outdent`
			try {} catch (oldError) {
				throw new CustomError('oops', {}, {cause: oldError});
			}
		`,

		outdent`
			try {} catch (error1) {
				function foo () {
					throw new Error('oops 1');
				}
			}
		`,
		outdent`
			try {} catch (error1) {
				let foo = (bar) => {
					throw new Error('oops 1');
				}
			}
		`,
		outdent`
			try {} catch (error1) {
				let foo = function (bar) {
					throw new Error('oops 1');
				}
			}
		`,
	],
	invalid: [
		// ** Not sure #1342
		// outdent`
		// 	try {} catch (error) {
		// 		error.message = 'oops';
		// 		throw error;
		// 	}
		// `,

		// `cause` not specified
		'try {} catch { throw new Error(\'oops\'); }',
		'try {} catch (oldError) { throw new Error(\'oops\'); }',
		// Cannot be fixed when Error constructor's argument length is 0
		'try {} catch (oldError) { throw new Error(); }',
		'try {} catch (oldError) { throw new Error; }',
		'try {} catch { throw new Error(); }',
		'try {} catch { throw new Error; }',
		// Cannot be fixed since catch argument type is not identifier
		'try {} catch ({}) { throw new Error(\'oops\'); }',
		'try {} catch ({error}) { throw new Error(\'oops\'); }',
		'try {} catch ({error}) { throw new Error(\'oops\', {cause: error}); }',

		// Should be fixed
		outdent`
			try {} catch (oldError) {
				const error = new Error('oops');
				throw error;
			}
		`,

		outdent`
			try {} catch {
				try {} catch (oldError2) {
					throw new Error(oldError2);
				}
			}
		`,
		outdent`
			try {} catch (oldError1) {
				throw new Error(oldError1);
				try {} catch (oldError2) {
					throw new Error(oldError2);
				}
			}
		`,
		outdent`
			try {} catch {
				try {} catch (oldError2) {
					throw new Error(oldError1);
				}
			}
		`,
		outdent`
			try {} catch (oldError) {
				try {} catch {
					throw oldError;
				}
			}
		`,
		outdent`
			try {} catch (oldError) {
				if (true) {
					throw new Error('oops', {cause: oldError});
				} else if (true) {
					throw new Error('oops');
				} else {
					throw new Error('oops');
				}
			}
		`,
		outdent`
			try {} catch (oldError) {
				if (true) {
					if (true) {
						throw new Error('oops', {cause: oldError});
					} else {
						throw new Error('oops');
					}
				}
			}
		`,
		outdent`
			try {} catch (oldError) {
				let err;
				err = new Error;
				throw err;
			}
		`,
		outdent`
			try {} catch (oldError) {
				let err;
				err = new Error('oops');
				throw err;
			}
		`,
		outdent`
			try {} catch (oldError) {
				let err;
				if (1 + 1 >= 2) {
					err = new Error('oops');
				} else {
					err = new Error('oops');
				}
				throw err;
			}
		`,

		// Should be fixed by inserting error argument
		outdent`
			try {} catch {
				throw new Error('oops', {other: 'abc'});
			}
		`,

		// Cannot be fixed because 'error' already exists in the scope.
		outdent`
			try {} catch {
				const error = new Error('oops');
				throw error;
			}
		`,

		outdent`
			try {} catch (oldError) {
				throw new CustomError('oops', { url });
			}
		`,
		outdent`
			try {} catch (oldError) {
				throw new CustomError('oops', {}, {url});
			}
		`,
		outdent`
			try {} catch (oldError) {
				throw new CustomError('oops', {}, {url: 'abc'});
			}
		`,
		outdent`
			try {} catch (oldError) {
				throw new CustomError('oops', {}, {url});
			}
		`,
		outdent`
			try {} catch (oldError) {
				throw new CustomError('oops', {}, {});
			}
		`,
	],
});

test.snapshot({
	valid: [
		'promise.catch',
		'promise.catch();',
		'promise.catch(() => {});',
		'promise.catch(function () {});',
		'promise.catch(oldError => { throw new Error(\'oops\', {cause:oldError}); });',
		'promise.catch(function (oldError) { throw new Error(\'oops\', {cause:oldError}); });',
		'promise.then().catch(oldError => { throw new Error(\'oops\', {cause:oldError}); });',
		'promise.then().catch(function (oldError) { throw new Error(\'oops\', {cause:oldError}); });',
		'promise.catch(oldError => { throw new Error(\'oops\', {cause:oldError}); });',
		outdent`
			promise.catch(oldError => {
				const error = new Error('oops', {cause:oldError});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (oldError) {
				const error = new Error('oops', {cause: oldError});
				throw error;
			});
		`,
		outdent`
			promise.catch(oldError => {
				const error = new Error('oops', {cause: oldError, other: 'abc'});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (oldError) {
				const error = new Error('oops', {cause: oldError, other: 'abc'});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (oldError) {
				let error;
				error = new Error('oops', {cause:oldError});
				throw error;
			});
		`,

		outdent`
			promise.catch(function (oldError) {
				let error;

				if (someCondition) {
					error = new Error('oops', {cause:oldError});
				} else {
					error = new Error('oops', {cause:oldError});
				}
				throw error;
			});
		`,

		outdent`
			promise.catch(oldError1 => {
				const error1 = new Error('oops', {cause: oldError1});
				throw error1;

				promise2.catch(oldError2 => {
					const error2 = new Error('oops', {cause: oldError2});
					throw error2;
				});
			});
		`,
		outdent`
			promise.catch(function (oldError1) {
				const error1 = new Error('oops', {cause: oldError1});
				throw error1;

				promise2.catch(function (oldError2) {
					const error2 = new Error('oops', {cause: oldError2});
					throw error2;
				});
			});
		`,
		outdent`
			promise.then().catch(oldError => {
				throw new Error('oops', {cause: oldError});
			});
		`,
		outdent`
			promise.then().then().catch(oldError => {
				throw new Error('oops', {cause: oldError});
			});
		`,
		outdent`
			promise.then()
				.catch(oldError => {
					throw new Error('oops', {cause: oldError});
				})
				.catch(oldError2 => {
					throw new Error('oops', {cause: oldError2});
				});
		`,

		outdent`
			promise.then(function () {
				throw new Error("oops");
			}).catch(foo.bar);
		`,

		outdent`
			try {

			} catch (error) {
				promise.then(function () {
					throw new Error("oops");
				})
				.then(onSuccess, onFailure);
			}
		`,
	],
	invalid: [
		'promise.catch(oldError => { throw new Error(); });',
		'promise.catch(function (oldError) { throw new Error(); });',
		'promise.catch(oldError => { throw new Error; });',
		'promise.catch(function (oldError) { throw new Error; });',
		'promise.catch(oldError => { throw new Error(\'oops\'); });',
		'promise.catch(function (oldError) { throw new Error(\'oops\'); });',
		'promise.catch(({oldError}) => { throw new Error(\'oops\', {cause:oldError}); });',
		'promise.catch(function ({oldError}) { throw new Error(\'oops\', {cause:oldError}); });',

		outdent`
			promise.catch(oldError => {
				const error = new Error('oops', {other: 'abc'});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (oldError) {
				const error = new Error('oops', {other: 'abc'});
				throw error;
			});
		`,

		'promise.catch(() => { throw new Error(\'oops\'); });',
		'promise.catch(function () { throw new Error(\'oops\'); });',

		outdent`
			promise.catch(function () {
				let error = new Error;
				throw error;
			});
		`,

		outdent`
			promise.catch(function () {
				let error;
				error = new Error('oops');
				throw error;
			});
		`,

		outdent`
			promise.catch(function () {
				let error;

				if (someCondition) {
					error = new Error('oops');
				} else {
					error = new Error('oops');
				}
				throw error;
			});
		`,

		outdent`
			asyncFunc().catch(() => {
				return promise.catch(() => {
					throw new Error('');
				});
			});
		`,
		outdent`
			asyncFunc().catch(function () {
				return promise.catch(function () {
					throw new Error('');
				});
			});
		`,

		outdent`
			promise1.catch(() => {
				return promise2.catch(() => {
					throw new Error('');
				});
			})
			.catch(onError);
		`,
		outdent`
			promise1.catch(function () {
				return promise2.catch(function () {
					throw new Error('');
				});
			})
			.catch(onError);
		`,
		outdent`
			promise.then(undefined, (oldError) => {
				throw new Error('oops');
			});
		`,
		outdent`
			promise.then(undefined, (oldError) => {
				if (true) {
					throw new Error('oops', {cause: oldError});
				} else if (true) {
					throw new Error('oops');
				} else {
					throw new Error('oops');
				}
			});
		`,
		outdent`
			promise.then(undefined, (oldError) => {
				if (true) {
					if (true) {
						throw new Error('oops', {cause: oldError});
					} else {
						throw new Error('oops');
					}
				}
			});
		`,
		outdent`
			try {} catch (error1) {
				foo(bar).catch(error2 => {
					throw new Error('oops 2');
				})

				function foo(bar) {
					throw new Error('oops 1');
				}
			}
		`,

		outdent`
			const someCallback = oldError => {
				throw new Error('foo');
			};

			promise.catch(someCallback);
		`,

		outdent`
			const someCallback = function (oldError) {
				throw new Error('foo');
			};

			promise.catch(someCallback);
		`,

		outdent`
			const someCallback = oldError => {
				throw new Error('foo');
			};

			promise.then(undefined, someCallback);
		`,

		outdent`
			const someCallback = function (oldError) {
				throw new Error('foo');
			};

			promise.then(undefined, someCallback);
		`,

		outdent`
			const someCallback = function (oldError) {
				throw new Error('foo');
			};

			promise.then(undefined, err => someCallback(err));
		`,

		outdent`
			let someCallback = (error1) => {
				throw new Error('foo');
			};

			try {

			} catch (error1) {
				someCallback = (error2) => {
					throw new Error('bar');
				}
			}

			{
				promise.catch(someCallback);
			}
		`,
	],
});
