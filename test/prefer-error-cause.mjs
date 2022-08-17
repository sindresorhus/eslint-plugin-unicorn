import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Throw statement not exists
		'try {} finally {}',
		'try {} catch {}',
		'try {} catch (error) {}',

		// Rethrow caught error itself
		'try {} catch (error) { throw error; }',

		// Specify caught error as cause
		outdent`
			try {} catch (error) {
				throw new Error('oops', {cause: error});
			}
		`,
		outdent`
			try {} catch (oldError) {
				const error = new Error('oops', {cause: oldError});
				throw error;
			}
		`,
		outdent`
			try {} catch (oldError) {
				const error = new Error('oops', {cause: oldError});
				throw oldError;
			}
		`,
		outdent`
			try {

			} catch {
				try {

				} catch (error) {
					throw new Error('oops', {cause: error});
				}
			}
		`,
		outdent`
			try {

			} catch (error1) {
				throw new Error(error1, {cause: error1});
				try {

				} catch (error2) {
					throw new Error(error2, {cause: error2});
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

		// Specify old error as CustomError's cause
		outdent`
			try {} catch (error) {
				throw new CustomError({cause: error});
			}
		`,
		outdent`
			try {} catch (error) {
				throw new CustomError('oops', {cause: error});
			}
		`,
		outdent`
			try {} catch (error) {
				throw new CustomError('oops', {}, {cause: error});
			}
		`,

		// Error is in the outer scope of the function including throw statement.
		outdent`
			try {} catch (error) {
				function foo () {
					throw new Error('oops');
				}
			}
		`,
		outdent`
			try {} catch (error) {
				let foo = bar => {
					throw new Error('oops');
				}
			}
		`,
		outdent`
			try {} catch (error) {
				let foo = function (bar) {
					throw new Error('oops');
				}
			}
		`,
		outdent`
			try {} catch (error) {
				(() => {
					throw new Error('oops');
				}) ();
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

		// Cannot be fixed when Error constructor's argument length is 0
		'try {} catch (error) { throw new Error(); }',
		'try {} catch (error) { throw new Error; }',
		'try {} catch { throw new Error(); }',
		'try {} catch { throw new Error; }',
		outdent`
			try {} catch (oldError) {
				let error;
				error = new Error;
				throw error;
			}
		`,

		// Cannot be fixed since catch's argument type is not 'Identifier'
		'try {} catch ({}) { throw new Error(\'oops\'); }',
		'try {} catch ({error}) { throw new Error(\'oops\'); }',
		'try {} catch ({error}) { throw new Error(\'oops\', {cause: error}); }',

		// Cannot be fixed when the thrown error identifier already exist in the scope
		outdent`
			try {} catch {
				const error = new Error('oops');
				throw error;
			}
		`,
		outdent`
			try {} catch (oldError) {
				try {} catch {
					throw oldError;
				}
			}
		`,

		// Could be fixed by specifying given error argument
		'try {} catch { throw new Error(\'oops\'); }',
		'try {} catch (error) { throw new Error(\'oops\'); }',
		outdent`
			try {} catch (oldError) {
				const error = new Error('oops');
				throw error;
			}
		`,
		outdent`
			try {} catch {
				try {} catch (error) {
					throw new Error(error);
				}
			}
		`,
		outdent`
			try {} catch (error1) {
				throw new Error(error1);
				try {} catch (error2) {
					throw new Error(error2);
				}
			}
		`,
		outdent`
			try {} catch {
				try {} catch (error2) {
					throw new Error(error1);
				}
			}
		`,
		outdent`
			try {} catch (error) {
				if (true) {
					throw new Error('oops', {cause: error});
				} else if (true) {
					throw new Error('oops');
				} else {
					throw new Error('oops');
				}
			}
		`,
		outdent`
			try {} catch (error) {
				if (true) {
					if (true) {
						throw new Error('oops', {cause: error});
					} else {
						throw new Error('oops');
					}
				}
			}
		`,
		outdent`
			try {} catch (error) {
				let err;
				err = new Error('oops');
				throw err;
			}
		`,
		outdent`
			try {} catch (error) {
				let err;
				if (1 + 1 >= 2) {
					err = new Error('oops');
				} else {
					err = new Error('oops');
				}
				throw err;
			}
		`,

		// Could be fixed by inserting error argument
		outdent`
			try {} catch {
				throw new Error('oops', {foo: 'bar'});
			}
		`,

		// Could be fixed by inserting error argument into the last argument of custom error constructor.
		outdent`
			try {} catch (error) {
				throw new CustomError('oops', {});
			}
		`,
		outdent`
			try {} catch (error) {
				throw new CustomError('oops', {foo});
			}
		`,
		outdent`
			try {} catch (error) {
				throw new CustomError('oops', {}, {});
			}
		`,
		outdent`
			try {} catch (error) {
				throw new CustomError('oops', {}, {foo});
			}
		`,
		outdent`
			try {} catch (error) {
				throw new CustomError('oops', {}, {foo: 'bar'});
			}
		`,
		outdent`
			try {} catch (error) {
				throw new CustomError('oops', {}, {foo: foo.bar});
			}
		`,
	],
});

test.snapshot({
	valid: [
		// Throw statement not exists
		'promise.catch',
		'promise.catch();',
		'promise.catch(() => {});',
		'promise.catch(() => {}).finally(() => {});',
		'promise.catch(function () {});',
		'promise.catch(function () {}).finally(() => {});',

		// Specify caught error as cause
		'promise.catch(error => { throw new Error(\'oops\', {cause: error}); });',
		'promise.catch(function (error) { throw new Error(\'oops\', {cause: error}); });',
		'promise.then().catch(error => { throw new Error(\'oops\', {cause: error}); });',
		'promise.then().catch(function (error) { throw new Error(\'oops\', {cause: error}); });',
		'promise.catch(error => { throw new Error(\'oops\', {cause: error}); });',
		outdent`
			promise.catch(oldError => {
				const error = new Error('oops', {cause: oldError});
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
				const error = new Error('oops', {cause: oldError, foo: bar});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (oldError) {
				const error = new Error('oops', {cause: oldError, foo: bar});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (oldError) {
				let error;
				error = new Error('oops', {cause: oldError});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (oldError) {
				let error;

				if (someCondition) {
					error = new Error('oops', {cause: oldError});
				} else {
					error = new Error('oops', {cause: oldError});
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
			promise.catch(function (fooError) {
				const error1 = new Error('oops', {cause: fooError});
				throw error1;

				promise2.catch(function (barError) {
					const error2 = new Error('oops', {cause: barError});
					throw error2;
				});
			});
		`,
		outdent`
			promise.then().catch(error => {
				throw new Error('oops', {cause: error});
			});
		`,
		outdent`
			promise.then().then().catch(error => {
				throw new Error('oops', {cause: error});
			});
		`,
		outdent`
			promise.then()
				.catch(fooError => {
					throw new Error('oops', {cause: fooError});
				})
				.catch(barError => {
					throw new Error('oops', {cause: barError});
				});
		`,

		// Error is in the outer scope of the function including throw statement.
		outdent`
			promise.then(function () {
				throw new Error('oops');
			}).catch(foo.bar);
		`,
		outdent`
			try {

			} catch (error) {
				promise.then(function () {
					throw new Error('oops');
				})
				.then(onSuccess, onFailure)
				.finally(() => {});
			}
		`,
	],
	invalid: [
		// Cannot be fixed when Error constructor's argument length is 0
		'promise.catch(error => { throw new Error; });',
		'promise.catch(function (error) { throw new Error; });',
		'promise.catch(error => { throw new Error(); });',
		'promise.catch(function (error) { throw new Error(); });',
		'promise.then(undefined, error => { throw new Error; });',
		'promise.then(undefined, function (error) { throw new Error; });',
		'promise.then(undefined, error => { throw new Error(); });',
		'promise.then(undefined, function (error) { throw new Error(); });',
		outdent`
			promise.catch(function () {
				let error = new Error;
				throw error;
			});
		`,
		outdent`
			promise.then(undefined, function () {
				let error = new Error;
				throw error;
			});
		`,

		// Cannot be fixed since catch's argument type is not 'Identifier'
		'promise.catch(({error}) => { throw new Error(\'oops\', {cause: error}); });',
		'promise.catch(function ({error}) { throw new Error(\'oops\', {cause: error}); });',
		outdent`
			let someCallback = ({}) => { throw new Error('oops'); };
			promise.catch(someCallback);
		`,
		outdent`
			promise.catch(({}) => { throw new Error('oops'); });
		`,
		outdent`
			let someCallback = ({}) => { throw new Error('oops'); };
			promise.then(undefined, someCallback);
		`,
		outdent`
			promise.then(undefined, ({}) => { throw new Error('oops'); });;
		`,

		outdent`
			try {

			} catch (error) {
				promise.catch(() => {
					throw new Error('oops');
				});
			}
		`,

		// Could be fixed by specifying the given error argument
		'promise.catch(error => { throw new Error(\'oops\'); });',
		'promise.catch(function (error) { throw new Error(\'oops\'); });',
		'promise.then(undefined, error => { throw new Error(\'oops\'); });',
		'promise.then(undefined, function (error) { throw new Error(\'oops\'); });',
		outdent`
			promise.catch(oldError => {
				const error = new Error('oops', {foo: 'bar'});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (oldError) {
				const error = new Error('oops', {foo: 'bar'});
				throw error;
			});
		`,
		outdent`
			promise.then(undefined, oldError => {
				const error = new Error('oops', {foo: 'bar'});
				throw error;
			});
		`,
		outdent`
			promise.then(undefined, function (oldError) {
				const error = new Error('oops', {foo: 'bar'});
				throw error;
			});
		`,
		outdent`
			promise.catch(error => {
				if (true) {
					throw new Error('oops', {cause: error});
				} else if (true) {
					throw new Error('oops');
				} else {
					throw new Error('oops');
				}
			});
		`,
		outdent`
			promise.catch(error => {
				if (true) {
					if (true) {
						throw new Error('oops', {cause: error});
					} else {
						throw new Error('oops');
					}
				}
			});
		`,
		outdent`
			promise.then(undefined, error => {
				if (true) {
					throw new Error('oops', {cause: error});
				} else if (true) {
					throw new Error('oops');
				} else {
					throw new Error('oops');
				}
			});
		`,
		outdent`
			promise.then(undefined, error => {
				if (true) {
					if (true) {
						throw new Error('oops', {cause: error});
					} else {
						throw new Error('oops');
					}
				}
			});
		`,
		outdent`
			try {} catch (error1) {
				foo(bar).catch(error2 => {
					throw new Error('oops');
				})

				function foo(bar) {
					throw new Error('oops');
				}
			}
		`,
		outdent`
			const someCallback = error => {
				throw new Error('oops');
			};

			promise.catch(someCallback);
		`,
		outdent`
			const someCallback = function (error) {
				throw new Error('oops');
			};

			promise.catch(someCallback);
		`,
		outdent`
			const someCallback = function (error) {
				throw new Error('oops');
			};

			promise.catch(err => someCallback(err));
		`,
		outdent`
			const someCallback = error => {
				throw new Error('oops');
			};

			promise.then(undefined, someCallback);
		`,
		outdent`
			const someCallback = function (error) {
				throw new Error('oops');
			};

			promise.then(undefined, someCallback);
		`,
		outdent`
			const someCallback = function (error) {
				throw new Error('oops');
			};

			promise.then(undefined, err => someCallback(err));
		`,
		outdent`
			let someCallback = fooError => {
				throw new Error('foo');
			};

			try {

			} catch (barError) {
				someCallback = barError => {
					throw new Error('bar');
				}
			}

			{
				promise.catch(someCallback);
			}
		`,

		// Could be fixed by inserting error argument
		'promise.catch(() => { throw new Error(\'oops\'); });',
		'promise.catch(function () { throw new Error(\'oops\'); });',
		'promise.then(undefined, function () { throw new Error(\'oops\'); });',
		'promise.then(undefined, () => { throw new Error(\'oops\'); });',
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
			asyncFunction().catch(() => {
				return promise.catch(() => {
					throw new Error('oops');
				});
			});
		`,
		outdent`
			asyncFunction().catch(function () {
				return promise.catch(function () {
					throw new Error('oops');
				});
			});
		`,

		outdent`
			promise1.catch(() => {
				return promise2.catch(() => {
					throw new Error('oops');
				});
			})
			.catch(onError);
		`,
		outdent`
			promise1.catch(function () {
				return promise2.catch(function () {
					throw new Error('oops');
				});
			})
			.catch(onError);
		`,
	],
});
