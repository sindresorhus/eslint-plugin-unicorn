import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		outdent`try {} catch {}`,
		outdent`try {} catch (e) {}`,
		outdent`try {} catch (error) { throw error; }`,
		outdent`
			try {} catch (error) {
				throw new Error('oops', {cause: error});
			}
		`,
		outdent`
			try {} catch (error) {
				const err = new Error('oops', {cause: error});
				throw error;
			}
		`,
		outdent`
			try {} catch (error) {
				const err = new Error('oops', {cause: error});
				throw err;
			}
		`,
		outdent`
			try {

			} catch {
				try {

				} catch (e2) {
					throw new Error(e2, {cause:e2});
				}
			}
		`,
		outdent`
			try {

			} catch (e1) {
				throw new Error(e1, {cause:e1});
				try {

				} catch (e2) {
					throw new Error(e2, {cause:e2});
				}
			}
		`,
		outdent`
			try {} catch (error) {
				throw new CustomError('oops', {}, {cause: error});
			}
		`
	],
	invalid: [
		// ** Not sure
		// outdent`
		// 	try {} catch (error) {
		// 		error.message = 'oops';
		// 		throw error;
		// 	}
		// `,

		outdent`try {} catch { throw new Error('oops'); }`,
		outdent`try {} catch (error) { throw new Error('oops'); }`,
		outdent`try {} catch (error) { throw new Error(); }`,
		outdent`try {} catch (error) { throw new Error; }`,
		outdent`try {} catch { throw new Error(); }`,
		outdent`try {} catch { throw new Error; }`,
		outdent`try {} catch ({}) { throw new Error('oops'); }`,
		outdent`try {} catch ({error}) { throw new Error('oops'); }`,
		outdent`try {} catch ({error}) { throw new Error('oops', {cause: error}); }`,
		outdent`
			try {} catch (err) {
				throw new Error('oops', {cause: error});
			}
		`,
		outdent`
			try {} catch (err) {
				throw new Error('oops', {cause: error, other: 'abc'});
			}
		`,
		outdent`
			try {} catch {
				throw new Error('oops', {other: 'abc'});
			}
		`,
		outdent`
			try {} catch {
				const err = new Error('oops');
				throw err;
			}
		`,
		outdent`
			try {} catch (error) {
				const err = new Error('oops');
				throw err;
			}
		`,
		outdent`
			try {} catch (error) {
				const err = new Error('oops', {cause: error2});
				throw err;
			}
		`,
		outdent`
			try {

			} catch {
				try {

				} catch (e2) {
					throw new Error(e2);
				}
			}
		`,
		outdent`
			try {

			} catch (e1) {
				throw new Error(e1);
				try {

				} catch (e2) {
					throw new Error(e2);
				}
			}
		`,
		outdent`
			try {

			} catch {
				try {

				} catch (e2) {
					throw new Error(e1);
				}
			}
		`,
		outdent`
			try {

			} catch (error) {
				try {

				} catch {
					throw error;
				}
			}
		`,
		outdent`
			try {} catch (error) {
				throw new CustomError('oops', {}, {cause: err});
			}
		`,
		outdent`
			try {} catch (error) {
				throw new CustomError('oops', {}, {cause: err});
			}
		`,
		outdent`
			try {
			} catch (err) {
				throw new CustomError('oops', { url });
			}
		`,
		outdent`
			try {
			} catch (err) {
				throw new CustomError('oops', {}, {url});
			}
		`,
		outdent`
			try {
			} catch (err) {
				throw new CustomError('oops', {}, {url: 'abc'});
			}
		`,
		outdent`
			try {
			} catch (err) {
				throw new CustomError('oops', {}, {url});
			}
		`,
		outdent`
			try {
			} catch (err) {
				throw new CustomError('oops', {}, {});
			}
		`,
	],
});

test.snapshot({
	valid: [
		// ** Not sure need to check inner blocks of the variable
		// outdent`promise.catch(someCallback);`,

		outdent`promise.catch`,
		outdent`promise.catch();`,
		outdent`promise.catch(() => {});`,
		outdent`promise.catch(function () {});`,
		outdent`promise.catch(err => { throw new Error('oops', {cause:err}); });`,
		outdent`promise.catch(function (err) { throw new Error('oops', {cause:err}); });`,
		outdent`promise.then().catch(err => { throw new Error('oops', {cause:err}); });`,
		outdent`promise.then().catch(function (err) { throw new Error('oops', {cause:err}); });`,
		outdent`promise.catch((err) => { throw new Error('oops', {cause:err}); });`,
		outdent`
			promise.catch((err) => {
				const error = new Error('oops', {cause:err});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (err) {
				const error = new Error('oops', {cause:err});
				throw error;
			});
		`,
		outdent`
			promise.catch((err) => {
				const error = new Error('oops', {cause: err, other: 'abc'});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (err) {
				const error = new Error('oops', {cause: err, other: 'abc'});
				throw error;
			});
		`,
		outdent`
			promise.catch((err1) => {
				const error1 = new Error('oops', {cause: err1});
				throw error1;

				promise2.catch((err2) => {
					const error2 = new Error('oops', {cause: err2});
					throw error2;
				});
			});
		`,
		outdent`
			promise.catch(function (err1) {
				const error1 = new Error('oops', {cause: err1});
				throw error1;

				promise2.catch(function (err2) {
					const error2 = new Error('oops', {cause: err2});
					throw error2;
				});
			});
		`,
	],
	invalid: [
		outdent`promise.catch((err) => { throw new Error(); });`,
		outdent`promise.catch(function (err) { throw new Error(); });`,
		outdent`promise.catch((err) => { throw new Error; });`,
		outdent`promise.catch(function (err) { throw new Error; });`,
		outdent`promise.catch((err) => { throw new Error('oops'); });`,
		outdent`promise.catch(function (err) { throw new Error('oops'); });`,
		outdent`promise.catch(({err}) => { throw new Error('oops', {cause:err}); });`,
		outdent`promise.catch(function ({err}) { throw new Error('oops', {cause:err}); });`,
		outdent`
			promise.catch((err) => {
				const error = new Error('oops', {cause:err2});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (err) {
				const error = new Error('oops', {cause:err2});
				throw error;
			});
		`,
		outdent`
			promise.catch((err) => {
				const error = new Error('oops', {other: 'abc'});
				throw error;
			});
		`,
		outdent`
			promise.catch(function (err) {
				const error = new Error('oops', {other: 'abc'});
				throw error;
			});
		`,
		outdent`
			promise.catch((err1) => {
				const error1 = new Error('oops', {cause: err1});
				throw error1;

				promise2.catch((err2) => {
					const error2 = new Error('oops', {cause: err1});
					throw error2;
				});
			});
		`,
		outdent`
			promise.catch(function (err1) {
				const error1 = new Error('oops', {cause: err1});
				throw error1;

				promise2.catch(function (err2) {
					const error2 = new Error('oops', {cause: err1});
					throw error2;
				});
			});
		`,
		outdent`promise.catch(() => { throw new Error('oops'); });`,
		outdent`promise.catch(function () { throw new Error('oops'); });`,

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
