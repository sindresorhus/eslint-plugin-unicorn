import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/catch-error-name';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

function testCase(code, name, error, output) {
	return {
		code,
		output: output || code,
		options: name ? [{name}] : [],
		errors: error ? [{ruleId: 'catch-error-name'}] : []
	};
}

ruleTester.run('catch-error-name', rule, {
	valid: [
		testCase('try {} catch (error) {}'),
		testCase('try {} catch (_) {}'),
		testCase('try {} catch (_) { console.log(foo); }'),
		testCase('try {} catch (err) {}', 'err'),
		testCase('try {} catch (outerError) { try {} catch (innerError) {} }'),
		testCase(outdent`
			const handleError = error => {
				try {
					doSomething();
				} catch (error_) {
					console.log(error_);
				}
			}
		`),
		testCase(outdent`
			const handleError = err => {
				try {
					doSomething();
				} catch (err_) {
					console.log(err_);
				}
			}
		`, 'err'),
		testCase(outdent`
			const handleError = error => {
				const error_ = new Error('🦄');

				try {
					doSomething();
				} catch (error__) {
					console.log(error__);
				}
			}
		`),
		testCase('obj.catch(error => {})'),
		testCase(outdent`
			const handleError = error => {
				obj.catch(error_ => { });
			}
		`),
		testCase(outdent`
			const handleError = err => {
				obj.catch(err_ => { });
			}
		`, 'err'),
		testCase(outdent`
			const handleError = error => {
				const error_ = new Error('foo bar');

				obj.catch(error__ => { });
			}
		`),
		testCase(outdent`
			const handleError = error => {
				const error_ = new Error('foo bar');
				const error__ = new Error('foo bar');
				const error___ = new Error('foo bar');
				const error____ = new Error('foo bar');
				const error_____ = new Error('foo bar');
				const error______ = new Error('foo bar');
				const error_______ = new Error('foo bar');
				const error________ = new Error('foo bar');
				const error_________ = new Error('foo bar');

				obj.catch(error__________ => { });
			}
		`),
		testCase('obj.catch(() => {})'),
		testCase('obj.catch((_) => {})'),
		testCase('obj.catch((_) => { console.log(foo); })'),
		testCase('obj.catch(err => {})', 'err'),
		testCase('obj.catch(outerError => { return obj2.catch(innerError => {}) })'),
		testCase('obj.catch(function (error) {})'),
		testCase('obj.catch(function () {})'),
		testCase('obj.catch(function (err) {})', 'err'),
		testCase('obj.catch(function (outerError) { return obj2.catch(function (innerError) {}) })'),
		testCase('obj.catch()'),
		testCase('obj.catch(_ => { console.log(_); })'),
		testCase('obj.catch(function (_) { console.log(_); })'),
		testCase('foo(function (error) {})'),
		testCase('foo().then(function (error) {})'),
		testCase('foo().catch(function (error) {})'),
		testCase('try {} catch (_) {}'),
		testCase('try {} catch (_) { try {} catch (_) {} }'),
		testCase('try {} catch (_) { console.log(_); }'),
		testCase(outdent`
				const handleError = error => {
					try {
						doSomething();
					} catch (_) {
						console.log(_);
					}
				}
		`),
		testCase('obj.catch(_ => {})'),
		{
			code: 'try {} catch (skipErr) {}',
			options: [
				{
					caughtErrorsIgnorePattern: '^skip'
				}
			]
		},
		testCase(outdent`
			try {
				throw new Error('message');
			} catch {
				console.log('failed');
			}
		`)
	],

	invalid: [
		testCase('try {} catch (err) { console.log(err) }', null, true, 'try {} catch (error) { console.log(error) }'),
		testCase('try {} catch (error) { console.log(error) }', 'err', true, 'try {} catch (err) { console.log(err) }'),
		testCase('try {} catch ({message}) {}', null, true),
		testCase('try {} catch (outerError) {}', null, true, 'try {} catch (error) {}'),
		testCase('try {} catch (innerError) {}', null, true, 'try {} catch (error) {}'),
		testCase('obj.catch(err => err)', null, true, 'obj.catch(error => error)'),
		testCase('obj.catch(error => error.stack)', 'err', true, 'obj.catch(err => err.stack)'),
		testCase('obj.catch(({message}) => {})', null, true),
		testCase('obj.catch(function (err) { console.log(err) })', null, true, 'obj.catch(function (error) { console.log(error) })'),
		testCase('obj.catch(function ({message}) {})', null, true),
		testCase('obj.catch(function (error) { console.log(error) })', 'err', true, 'obj.catch(function (err) { console.log(err) })'),
		// Failing tests for #107
		// testCase(outdent`
		// 	foo.then(() => {
		// 		try {} catch (e) {}
		// 	}).catch(error => error);
		// `, null, true),
		// testCase(outdent`
		// 	foo.then(() => {
		// 		try {} catch (e) {}
		// 	});
		// `, null, true),
		{
			code: outdent`
				const handleError = error => {
					try {
						doSomething();
					} catch (foo) {
						console.log(foo);
					}
				}
			`,
			output: outdent`
				const handleError = error => {
					try {
						doSomething();
					} catch (error_) {
						console.log(error_);
					}
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error_`.'
				}
			]
		},
		{
			code: outdent`
				const handleError = error => {
					try {
						doSomething();
					} catch (error2) {
						console.log(error2);
					}
				}
			`,
			output: outdent`
				const handleError = error => {
					try {
						doSomething();
					} catch (error_) {
						console.log(error_);
					}
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error_`.'
				}
			]
		},
		{
			code: outdent`
				const handleError = error => {
					const error9 = new Error('foo bar');

					try {
						doSomething();
					} catch (foo) {
						console.log(foo);
					}
				}
			`,
			output: outdent`
				const handleError = error => {
					const error9 = new Error('foo bar');

					try {
						doSomething();
					} catch (error_) {
						console.log(error_);
					}
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error_`.'
				}
			]
		},
		{
			code: outdent`
				const handleError = error => {
					const error_ = new Error('foo bar');

					obj.catch(foo => { });
				}
			`,
			output: outdent`
				const handleError = error => {
					const error_ = new Error('foo bar');

					obj.catch(error__ => { });
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error__`.'
				}
			]
		},
		{
			code: outdent`
				const handleError = error => {
					const error_ = new Error('foo bar');

					obj.catch(foo => { });
				}
			`,
			output: outdent`
				const handleError = error => {
					const error_ = new Error('foo bar');

					obj.catch(error__ => { });
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error__`.'
				}
			],
			options: [
				{
					name: 'error'
				}
			]
		},
		{
			code: outdent`
				obj.catch(err => {});
				obj.catch(err => {});
			`,
			output: outdent`
				obj.catch(error => {});
				obj.catch(error => {});
			`,
			errors: [
				{ruleId: 'catch-error-name'},
				{ruleId: 'catch-error-name'}
			]
		},
		{
			code: 'try {} catch (_error) {}',
			output: 'try {} catch (error) {}',
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error`.'
				}
			],
			options: [
				{
					caughtErrorsIgnorePattern: '^skip'
				}
			]
		},
		{
			code: outdent`
				Promise.reject(new Error())
					.catch(function onError(errorResult) {
						console.log('errorResult should be fixed to', errorResult)
					})
			`,
			output: outdent`
				Promise.reject(new Error())
					.catch(function onError(error) {
						console.log('errorResult should be fixed to', error)
					})
			`,
			errors: [
				{
					ruleId: 'catch-error-message',
					message: 'The catch parameter should be named `error`.'
				}
			]
		}
	]
});
