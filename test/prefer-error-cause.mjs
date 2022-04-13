import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'try {} catch {}',
		'try {} catch (oldError) {}',
		'try {} catch (oldError) { throw oldError; }',
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
				throw new CustomError('oops', {}, {cause: oldError});
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
	],
	invalid: [
		// ** Not sure
		// outdent`
		// 	try {} catch (error) {
		// 		error.message = 'oops';
		// 		throw error;
		// 	}
		// `,

		'try {} catch { throw new Error(\'oops\'); }',
		'try {} catch (oldError) { throw new Error(\'oops\'); }',
		'try {} catch (oldError) { throw new Error(); }',
		'try {} catch (oldError) { throw new Error; }',
		'try {} catch { throw new Error(); }',
		'try {} catch { throw new Error; }',
		'try {} catch ({}) { throw new Error(\'oops\'); }',
		'try {} catch ({error}) { throw new Error(\'oops\'); }',
		'try {} catch ({error}) { throw new Error(\'oops\', {cause: error}); }',
		outdent`
			try {} catch (oldError) {
				throw new Error('oops', {cause: someTypo});
			}
		`,
		outdent`
			try {} catch (oldError) {
				throw new Error('oops', {cause: someTypo, other: 'abc'});
			}
		`,
		outdent`
			try {} catch {
				throw new Error('oops', {other: 'abc'});
			}
		`,
		outdent`
			try {} catch {
				const error = new Error('oops');
				throw error;
			}
		`,
		outdent`
			try {} catch (oldError) {
				const error = new Error('oops');
				throw error;
			}
		`,
		outdent`
			try {} catch (oldError) {
				const error = new Error('oops', {cause: someTypo});
				throw error;
			}
		`,
		outdent`
			try {

			} catch {
				try {

				} catch (oldError2) {
					throw new Error(oldError2);
				}
			}
		`,
		outdent`
			try {

			} catch (oldError1) {
				throw new Error(oldError1);
				try {

				} catch (oldError2) {
					throw new Error(oldError2);
				}
			}
		`,
		outdent`
			try {

			} catch {
				try {

				} catch (oldError2) {
					throw new Error(oldError1);
				}
			}
		`,
		outdent`
			try {

			} catch (oldError) {
				try {

				} catch {
					throw oldError;
				}
			}
		`,
		outdent`
			try {} catch (oldError) {
				throw new CustomError('oops', {}, {cause: someTypo});
			}
		`,
		outdent`
			try {} catch (oldError) {
				throw new CustomError('oops', {}, {cause: someTypo});
			}
		`,
		outdent`
			try {
			} catch (oldError) {
				throw new CustomError('oops', { url });
			}
		`,
		outdent`
			try {
			} catch (oldError) {
				throw new CustomError('oops', {}, {url});
			}
		`,
		outdent`
			try {
			} catch (oldError) {
				throw new CustomError('oops', {}, {url: 'abc'});
			}
		`,
		outdent`
			try {
			} catch (oldError) {
				throw new CustomError('oops', {}, {url});
			}
		`,
		outdent`
			try {
			} catch (oldError) {
				throw new CustomError('oops', {}, {});
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
	],
});

test.snapshot({
	valid: [
		// ** Not sure need to check inner blocks of the variable
		// outdent`promise.catch(someCallback);`,

		'promise.catch',
		'promise.catch();',
		'promise.catch(() => {});',
		'promise.catch(function () {});',
		'promise.catch(oldError => { throw new Error(\'oops\', {cause:oldError}); });',
		'promise.catch(function (oldError) { throw new Error(\'oops\', {cause:oldError}); });',
		'promise.then().catch(oldError => { throw new Error(\'oops\', {cause:oldError}); });',
		'promise.then().catch(function (oldError) { throw new Error(\'oops\', {cause:oldError}); });',
		'promise.catch((oldError) => { throw new Error(\'oops\', {cause:oldError}); });',
		outdent`
			promise.catch((oldError) => {
				const error = new Error('oops', {cause:oldError});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (oldError) {
				const error = new Error('oops', {cause:oldError});
				throw error;
			});
		`,
		outdent`
			promise.catch((oldError) => {
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
			promise.catch((oldError1) => {
				const error1 = new Error('oops', {cause: oldError1});
				throw error1;

				promise2.catch((oldError2) => {
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
	],
	invalid: [
		'promise.catch((oldError) => { throw new Error(); });',
		'promise.catch(function (oldError) { throw new Error(); });',
		'promise.catch((oldError) => { throw new Error; });',
		'promise.catch(function (oldError) { throw new Error; });',
		'promise.catch((oldError) => { throw new Error(\'oops\'); });',
		'promise.catch(function (oldError) { throw new Error(\'oops\'); });',
		'promise.catch(({oldError}) => { throw new Error(\'oops\', {cause:oldError}); });',
		'promise.catch(function ({oldError}) { throw new Error(\'oops\', {cause:oldError}); });',
		outdent`
			promise.catch((oldError) => {
				const error = new Error('oops', {cause:someTypo});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (oldError) {
				const error = new Error('oops', {cause:someTypo});
				throw error;
			});
		`,
		outdent`
			promise.catch((oldError) => {
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
		outdent`
			promise.catch((oldError1) => {
				const error1 = new Error('oops', {cause: oldError2});
				throw error1;

				promise2.catch((oldError2) => {
					const error2 = new Error('oops', {cause: oldError1});
					throw error2;
				});
			});
		`,
		outdent`
			promise.catch(function (oldError1) {
				const error1 = new Error('oops', {cause: oldError1});
				throw error1;

				promise2.catch(function (oldError2) {
					const error2 = new Error('oops', {cause: oldError1});
					throw error2;
				});
			});
		`,
		'promise.catch(() => { throw new Error(\'oops\'); });',
		'promise.catch(function () { throw new Error(\'oops\'); });',

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
	],
});
