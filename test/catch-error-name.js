import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/catch-error-name';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

function testCase(code, name, error) {
	return {
		code,
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
		testCase(`
			const handleError = error => {
				try {
					doSomething();
				} catch (error2) {
					console.log(error2);
				}
			}
		`),
		testCase(`
			const handleError = err => {
				try {
					doSomething();
				} catch (err2) {
					console.log(err2);
				}
			}
		`, 'err'),
		testCase(`
			const handleError = error => {
				const error2 = new Error('🦄');

				try {
					doSomething();
				} catch (error3) {
					console.log(error3);
				}
			}
		`),
		testCase('obj.catch(error => {})'),
		testCase(`
			const handleError = error => {
				obj.catch(error2 => { });
			}
		`),
		testCase(`
			const handleError = err => {
				obj.catch(err2 => { });
			}
		`, 'err'),
		testCase(`
			const handleError = error => {
				const error2 = new Error('foo bar');

				obj.catch(error3 => { });
			}
		`),
		testCase(`
			const handleError = error => {
				const error2 = new Error('foo bar');
				const error3 = new Error('foo bar');
				const error4 = new Error('foo bar');
				const error5 = new Error('foo bar');
				const error6 = new Error('foo bar');
				const error7 = new Error('foo bar');
				const error8 = new Error('foo bar');
				const error9 = new Error('foo bar');
				const error10 = new Error('foo bar');

				obj.catch(error11 => { });
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
		testCase(`
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
		// TODO: Uncomment once test runner supports optional-catch-binding https://github.com/tc39/proposal-optional-catch-binding
		// testCase(`
		// 	try {
		// 		throw new Error('message');
		// 	} catch {
		// 		console.log('failed');
		// 	}
		// `),
	],
	invalid: [
		testCase('try {} catch (err) {}', null, true),
		testCase('try {} catch (error) {}', 'err', true),
		testCase('try {} catch ({message}) {}', null, true),
		testCase('try {} catch (outerError) {}', null, true),
		testCase('try {} catch (innerError) {}', null, true),
		testCase('obj.catch(err => {})', null, true),
		testCase('obj.catch(error => {})', 'err', true),
		testCase('obj.catch(({message}) => {})', null, true),
		testCase('obj.catch(function (err) {})', null, true),
		testCase('obj.catch(function ({message}) {})', null, true),
		testCase('obj.catch(function (error) {})', 'err', true),
		// Failing tests for #107
		// testCase(`
		// 	foo.then(() => {
		// 		try {} catch (e) {}
		// 	}).catch(error => error);
		// `, null, true),
		// testCase(`
		// 	foo.then(() => {
		// 		try {} catch (e) {}
		// 	});
		// `, null, true),
		{
			code: `
				const handleError = error => {
					try {
						doSomething();
					} catch (foo) {
						console.log(foo);
					}
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error2`.'
				}
			]
		},
		{
			code: `
				const handleError = error => {
					const error9 = new Error('foo bar');

					try {
						doSomething();
					} catch (foo) {
						console.log(foo);
					}
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error2`.'
				}
			]
		},
		{
			code: `
				const handleError = error => {
					const error2 = new Error('foo bar');

					obj.catch(foo => { });
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error3`.'
				}
			]
		},
		{
			code: `
				const handleError = error => {
					const error2 = new Error('foo bar');

					obj.catch(foo => { });
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error3`.'
				}
			],
			options: [
				{
					name: 'error'
				}
			]
		},
		{
			code: `
				obj.catch(err => {});
				obj.catch(err => {});
			`,
			errors: [
				{ruleId: 'catch-error-name'},
				{ruleId: 'catch-error-name'}
			]
		},
		{
			code: 'try {} catch (_error) {}',
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
		}
	]
});
