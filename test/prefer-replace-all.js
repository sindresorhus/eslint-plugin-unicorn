import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
const rule = require('../rules/prefer-replace-all');

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const error = {
	ruleId: 'prefer-replace-all',
	message: 'Use replaceAll method of string.'
};

ruleTester.run('prefer-replace-all', rule, {
	valid: [
		'str.replace(/No global flag/,"123")',
		'str.replace(/[abc]/g,"123")',
		'str.replace(/abc?/g,"123")',
		'str.replace(/Non-literal characters .*/g, "something");',
		'str.replace(/Other non-literal \\W/g, "something");',

		'str.replace(/Extra flags/gi, "something");',
		'str.replace("Not a regex expression", "something")',
		'str.methodNotReplace(/Wrong method name/g, "something");'
	],
	invalid: [
		{
			code: 'str.replace(/This has no special regex symbols/g, \'something\')',
			output: 'str.replaceAll(\'This has no special regex symbols\', \'something\')',
			errors: [error]
		},
		{
			code: 'str.replace(/\\(It also checks for escaped regex symbols\\)/g,\'something\')',
			output: 'str.replaceAll(\'\\(It also checks for escaped regex symbols\\)\', \'something\')',
			errors: [error]
		},
		{
			code: 'str.replace(/a\\\\bc\\?/g,\'123\')',
			output: 'str.replaceAll(\'a\\\\bc\\?\', \'123\')',
			errors: [error]
		},
		{
			code: 'console.log(str.replace(/a\\\\bc\\?/g,\'123\'))',
			output: 'console.log(str.replaceAll(\'a\\\\bc\\?\', \'123\'))',
			errors: [error]
		},
		{
			code: 'str.replace(/"doubleQuotes"/g,\'1"2"3\')',
			output: 'str.replaceAll(\'"doubleQuotes"\', \'1"2"3\')',
			errors: [error]
		},
		{
			code: 'str.replace(/\'singleQuotes\'/g,"1\'2\'3")',
			output: 'str.replaceAll(\'\\\'singleQuotes\\\'\', \'1\\\'2\\\'3\')',
			errors: [error]
		},
		{
			code: 'str.replace(/searchPattern/g,\'\\\'escapedQuotes\\\'\')',
			output: 'str.replaceAll(\'searchPattern\', \'\\\'escapedQuotes\\\'\')',
			errors: [error]
		}
	]
});
