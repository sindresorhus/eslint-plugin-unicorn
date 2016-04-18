import test from 'ava';
import {RuleTester} from 'eslint';
import rule from '../rules/caught-error-name';

const ruleTester = new RuleTester({
	env: {
		es6: true
	}
});

function testCase(code, name, error) {
	return {
		code: code,
		options: name && [{name: name}],
		errors: error && [{ruleId: 'caught-error-name'}]
	};
}

test(() => {
	ruleTester.run('caught-error-name', rule, {
		valid: [
			testCase('try {} catch (err) {}'),
			testCase('try {} catch (error) {}', 'error'),
			testCase('try {} catch (outerError) { try {} catch (innerError) {} }')
		],
		invalid: [
			testCase('try {} catch (error) {}', null, true),
			testCase('try {} catch (err) {}', 'error', true),
			testCase('try {} catch (outerError) {}', null, true),
			testCase('try {} catch (innerError) {}', null, true)
		]
	});
});
