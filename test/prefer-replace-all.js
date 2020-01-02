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
		'foo.replace(/No global flag/, "123")',
		'foo.replace(/[abc]/g, "123")',
		'foo.replace(/abc?/g, "123")',
		'foo.replace(/Non-literal characters .*/g, \'something\');',
		'foo.replace(/Other non-literal \\W/g, \'something\');',

		'foo.replace(/Extra flags/gi, \'something\');',
		'foo.replace("Not a regex expression", \'something\')',
		'foo.methodNotReplace(/Wrong method name/g, \'something\');'
	],
	invalid: [
		{
			code: 'foo.replace(/This has no special regex symbols/g, \'something\')',
			output: 'foo.replaceAll(\'This has no special regex symbols\', \'something\')',
			errors: [error]
		},
		{
			code: 'foo.replace(/\\(It also checks for escaped regex symbols\\)/g, \'something\')',
			output: 'foo.replaceAll(\'\\(It also checks for escaped regex symbols\\)\', \'something\')',
			errors: [error]
		},
		{
			code: 'foo.replace(/a\\\\bc\\?/g, \'123\')',
			output: 'foo.replaceAll(\'a\\\\bc\\?\', \'123\')',
			errors: [error]
		},
		{
			code: 'console.log(foo.replace(/a\\\\bc\\?/g, \'123\'))',
			output: 'console.log(foo.replaceAll(\'a\\\\bc\\?\', \'123\'))',
			errors: [error]
		},
		{
			code: 'foo.replace(/"doubleQuotes"/g, \'1"2"3\')',
			output: 'foo.replaceAll(\'"doubleQuotes"\', \'1"2"3\')',
			errors: [error]
		},
		{
			code: 'foo.replace(/\'singleQuotes\'/g, "1\'2\'3")',
			output: 'foo.replaceAll(\'\\\'singleQuotes\\\'\', "1\'2\'3")',
			errors: [error]
		},
		{
			code: 'foo.replace(/searchPattern/g, \'\\\'escapedQuotes\\\'\')',
			output: 'foo.replaceAll(\'searchPattern\', \'\\\'escapedQuotes\\\'\')',
			errors: [error]
		},
		{
			code: 'foo().replace(/searchPattern/g, bar())',
			output: 'foo().replaceAll(\'searchPattern\', bar())',
			errors: [error]
		}
	]
});
