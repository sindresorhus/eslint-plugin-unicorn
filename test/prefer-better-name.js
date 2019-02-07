import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/prefer-better-name';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	},
	parserOptions: {
		sourceType: 'module'
	}
});

const invalidAmbiguousTestCase = (code, name, betterNames) => {
	return {
		code,
		output: code,
		errors: [{message: `Name \`${name}\` is ambiguous, is it ${betterNames.map(word => `\`${word}\``).join(' or ')} or something else`}]
	};
};

const makeReplaceError = (name, betterName) => {
	return {message: `Prefer \`${betterName}\` over \`${name}\``};
};

const invalidReplaceTestCase = (code, output, name, betterName) => {
	return {
		code,
		output,
		errors: [makeReplaceError(name, betterName)]
	};
};

ruleTester.run('prefer-better-name', rule, {
	valid: [
		'let error'
	],
	invalid: [
		invalidReplaceTestCase(
			'let str = "abc"; str+= str; console.log(`${str}`);',
			'let string = "abc"; string+= string; console.log(`${string}`);',
			'str',
			'string'),
		invalidReplaceTestCase(
			'try {} catch(err) { throw err; }',
			'try {} catch(error) { throw error; }',
			'err',
			'error'),
		invalidReplaceTestCase(
			`function test(err){
				const error = null;
				console.log(err);
			}`,
			`function test(error1){
				const error = null;
				console.log(error1);
			}`,
			'err',
			'error1'),
		invalidAmbiguousTestCase(
			'let e;',
			'e',
			['event', 'error'])
	]
});
