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

const options = {
	disabled: ['error', {
		baseRuleset: null,
		rules: {}
	}],
	changed: ['error', {
		baseRuleset: 'default',
		rules: {
			str: ''
		}
	}],
	custom: ['error', {
		baseRuleset: null,
		rules: {
			spider: 'arachnide'
		}
	}]
};

const makeAmbiguousError = (name, betterNames) => {
	return {
		message: `Name \`${name}\` is ambiguous, is it ${betterNames.map(word => `\`${word}\``).join(' or ')} or something else`
	};
};

const makeReplaceError = (name, betterName) => {
	return {message: `Prefer \`${betterName}\` over \`${name}\``};
};

ruleTester.run('prefer-better-name', rule, {
	valid: [
		'let error',
		'const error = new Error();',
		'let completelySaneName',
		{
			code: 'let str = 1',
			options: options.changed
		},
		{
			code: 'let str = 2',
			options: options.custom
		},
		{
			code: 'let str = 3',
			options: options.disabled
		}
	],
	invalid: [
		{
			code: 'let str = "abc"; str+= str; console.log(str);',
			output: 'let string = "abc"; string+= string; console.log(string);',
			errors: [makeReplaceError('str', 'string')]
		},
		{
			code: 'try {} catch(err) { throw err; }',
			output: 'try {} catch(error) { throw error; }',
			errors: [makeReplaceError('err', 'error')]
		},
		{
			code: `
			function test(err){
				const error = null;
				console.log(err);
			}`,
			output: `
			function test(error1){
				const error = null;
				console.log(error1);
			}`,
			errors: [makeReplaceError('err', 'error1')]
		},
		{
			code: 'let e',
			errors: [makeAmbiguousError('e', ['event', 'error'])]
		},

		{
			code: 'let err = new Error(); let str = "string";',
			output: 'let error = new Error(); let str = "string";',
			options: options.changed,
			errors: [makeReplaceError('err', 'error')]
		},
		{
			code: 'let spider = {type:"scary"};',
			output: 'let arachnide = {type:"scary"};',
			options: options.custom,
			errors: [makeReplaceError('spider', 'arachnide')]
		},
		{
			code: `
			function test(...err){
				console.log(err);
			}`,
			output: `
			function test(...error){
				console.log(error);
			}`,
			errors: [makeReplaceError('err', 'error')]
		}
	]
});
