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
		testCase('try {} catch (err) {}'),
		testCase('try {} catch (_) {}'),
		testCase('try {} catch (_) { console.log(foo); }'),
		testCase('try {} catch (error) {}', 'error'),
		testCase('try {} catch (outerError) { try {} catch (innerError) {} }'),
		testCase(`
			const handleError = err => {
				try {
					doSomething();
				} catch (err2) {
					console.log(err2);
				}
			}
		`),
		testCase(`
			const handleError = error => {
				try {
					doSomething();
				} catch (error2) {
					console.log(error2);
				}
			}
		`, 'error'),
		testCase(`
			const handleError = err => {
				const err2 = new Error('foo bar');

				try {
					doSomething();
				} catch (err3) {
					console.log(err3);
				}
			}
		`),
		testCase('obj.catch(err => {})'),
		testCase(`
			const handleError = err => {
				obj.catch(err2 => { });
			}
		`),
		testCase(`
			const handleError = error => {
				obj.catch(error2 => { });
			}
		`, 'error'),
		testCase(`
			const handleError = err => {
				const err2 = new Error('foo bar');

				obj.catch(err3 => { });
			}
		`),
		testCase(`
			const handleError = err => {
				const err2 = new Error('foo bar');
				const err3 = new Error('foo bar');
				const err4 = new Error('foo bar');
				const err5 = new Error('foo bar');
				const err6 = new Error('foo bar');
				const err7 = new Error('foo bar');
				const err8 = new Error('foo bar');
				const err9 = new Error('foo bar');
				const err10 = new Error('foo bar');

				obj.catch(err11 => { });
			}
		`),
		testCase('obj.catch(() => {})'),
		testCase('obj.catch((_) => {})'),
		testCase('obj.catch((_) => { console.log(foo); })'),
		testCase('obj.catch(error => {})', 'error'),
		testCase('obj.catch(outerError => { return obj2.catch(innerError => {}) })'),
		testCase('obj.catch(function (err) {})'),
		testCase('obj.catch(function () {})'),
		testCase('obj.catch(function (error) {})', 'error'),
		testCase('obj.catch(function (outerError) { return obj2.catch(function (innerError) {}) })'),
		testCase('obj.catch()'),
		testCase('foo(function (err) {})'),
		testCase('foo().then(function (err) {})'),
		testCase('foo().catch(function (err) {})')
	],
	invalid: [
		testCase('try {} catch (error) {}', null, true),
		testCase('try {} catch (err) {}', 'error', true),
		testCase('try {} catch ({message}) {}', null, true),
		testCase('try {} catch (_) { console.log(_); }', null, true),
		testCase('try {} catch (outerError) {}', null, true),
		testCase('try {} catch (innerError) {}', null, true),
		testCase('obj.catch(error => {})', null, true),
		testCase('obj.catch(err => {})', 'error', true),
		testCase('obj.catch(({message}) => {})', null, true),
		testCase('obj.catch(_ => { console.log(_); })', null, true),
		testCase('obj.catch(function (error) {})', null, true),
		testCase('obj.catch(function ({message}) {})', null, true),
		testCase('obj.catch(function (err) {})', 'error', true),
		testCase('obj.catch(function (_) { console.log(_); })', null, true),
		// Failing tests for #107
		// testCase(`
		// 	foo.then(() => {
		// 		try {} catch (e) {}
		// 	}).catch(err => err);
		// `, null, true),
		// testCase(`
		// 	foo.then(() => {
		// 		try {} catch (e) {}
		// 	});
		// `, null, true),
		{
			code: `
				const handleError = err => {
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
					message: 'The catch parameter should be named `err2`.'
				}
			]
		},
		{
			code: `
				const handleError = err => {
					const err9 = new Error('foo bar');

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
					message: 'The catch parameter should be named `err2`.'
				}
			]
		},
		{
			code: `
				const handleError = err => {
					const err2 = new Error('foo bar');

					obj.catch(foo => { });
				}
			`,
			errors: [
				{
					ruleId: 'catch-error-name',
					message: 'The catch parameter should be named `err3`.'
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
				obj.catch(error => {});
				obj.catch(error => {});
			`,
			errors: [
				{ruleId: 'catch-error-name'},
				{ruleId: 'catch-error-name'}
			]
		}
	]
});
