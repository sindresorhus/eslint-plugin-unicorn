import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/catch-error-name';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
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
		testCase('try {} catch (error) { try {} catch (error2) {} }'),
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
		testCase('obj.catch(error => { return obj2.catch(error2 => {}) })'),
		testCase('obj.catch(function (error) {})'),
		testCase('obj.catch(function () {})'),
		testCase('obj.catch(function (err) {})', 'err'),
		testCase('obj.catch(function (error) { return obj2.catch(function (error2) {}) })'),
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
		}
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
		testCase('try {} catch (err) {}', null, true, 'try {} catch (error) {}'),
		testCase('try {} catch (error) {}', 'err', true, 'try {} catch (err) {}'),
		testCase('try {} catch ({message}) {}', null, true),
		testCase('try {} catch (outerError) {}', null, true, 'try {} catch (error) {}'),
		testCase('try {} catch (innerError) {}', null, true, 'try {} catch (error) {}'),
		testCase('obj.catch(err => {})', null, true, 'obj.catch(error => {})'),
		testCase('obj.catch(error => {})', 'err', true, 'obj.catch(err => {})'),
		testCase('obj.catch(({message}) => {})', null, true),
		testCase('obj.catch(function (err) {})', null, true, 'obj.catch(function (error) {})'),
		testCase('obj.catch(function ({message}) {})', null, true),
		testCase('obj.catch(function (error) {})', 'err', true, 'obj.catch(function (err) {})'),
		{
			code: `
				foo.then(() => {
					try {} catch (e) {}
				}).catch(error => error);
			`,
			output: `
				foo.then(() => {
					try {} catch (error2) {}
				}).catch(error => error);
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
				foo.then(() => {
					try {} catch (e) {}
				});
			`,
			output: `
				foo.then(() => {
					try {} catch (error) {}
				});
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error`.'
				}
			]
		},
		{
			code: `
				try {
				
				} catch (e) {
					try {} catch (f) {}
				}
			`,
			output: `
				try {
				
				} catch (error) {
					try {} catch (error2) {}
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error`.'
				},
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error2`.'
				}
			]
		},
		{
			code: `
				try {
				
				} catch (e) {
					try {} catch (f) {
						obj.catch(t => {})
					}
				}
			`,
			output: `
				try {
				
				} catch (error) {
					try {} catch (error2) {
						obj.catch(error3 => {})
					}
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error`.'
				},
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error2`.'
				},
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `error3`.'
				}
			]
		},
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
			output: `
				const handleError = error => {
					try {
						doSomething();
					} catch (error2) {
						console.log(error2);
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
			output: `
				const handleError = error => {
					const error9 = new Error('foo bar');

					try {
						doSomething();
					} catch (error2) {
						console.log(error2);
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
			output: `
				const handleError = error => {
					const error2 = new Error('foo bar');

					obj.catch(error3 => { });
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
			output: `
				const handleError = error => {
					const error2 = new Error('foo bar');

					obj.catch(error3 => { });
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
			output: `
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
		}
	]
});
