import test from 'ava';
import {RuleTester} from 'eslint';
import rule from '../rules/catch-error-name';

const ruleTester = new RuleTester({
	env: {
		es6: true
	}
});

function testCase(code, name, error) {
	return {
		code: code,
		options: name && [{name: name}],
		errors: error && [{ruleId: 'catch-error-name'}]
	};
}

test(() => {
	ruleTester.run('catch-error-name', rule, {
		valid: [
			testCase('try {} catch (err) {}'),
			testCase('try {} catch (error) {}', 'error'),
			testCase('try {} catch (outerError) { try {} catch (innerError) {} }'),
			testCase('obj.catch(err => {})'),
			testCase('obj.catch(() => {})'),
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
			testCase('try {} catch (outerError) {}', null, true),
			testCase('try {} catch (innerError) {}', null, true),
			testCase('obj.catch(error => {})', null, true),
			testCase('obj.catch(err => {})', 'error', true),
			testCase('obj.catch(function (error) {})', null, true),
			testCase('obj.catch(function (err) {})', 'error', true),
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
});
