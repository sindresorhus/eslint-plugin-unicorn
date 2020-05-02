import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-reduce';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

const babelRuleTester = avaRuleTester(test, {
	parser: require.resolve('babel-eslint')
});
const typescriptRuleTester = avaRuleTester(test, {
	parser: require.resolve('@typescript-eslint/parser')
});

const error = {
	ruleId: 'no-reduce',
	message: 'No Array#reduce'
};

const tests = {
	valid: [

	],
	invalid: [
		{
			code: 'arr.reduce((total, item) => total + item)',
			errors: [error]
		},
		{
			code: 'arr.reduce((total, item) => total + item, 0)',
			errors: [error]
		},
		{
			code: 'arr.reduce(function (total, item) { return total + item }, 0)',
			errors: [error]
		},
		{
			code: 'arr.reduce(function (total, item) { return total + item })',
			errors: [error]
		},
		{
			code: 'arr.reduce((str, item) => str += item, \'\')',
			errors: [error]
		},
		{
			code: `
			arr.reduce((obj, item) => {
				obj[item] = null;
				return obj;
			}, {})
			`,
			errors: [error]
		},
		{
			code: `
			arr.reduce((obj, item) => ({
				...obj,
				[item]: null,
			}), {})
			`,
			errors: [error]
		},
		{
			code: `
			const hyphenate = (str, char) => \`\${str}-\${char}\`;
			["a", "b", "c"].reduce(hyphenate);
			`,
			errors: [error]
		},
		{
			code: `
			var arr = [1,2,3];
			[].reduce.call(arr, (s, i) => s + i)
			`,
			errors: [error]
		},
		{
			code: `
			var arr = [1,2,3];
			const sum = (s, i) => s + i;
			[].reduce.call(arr, sum);
			`,
			errors: [error]
		},
		{
			code: `
			var arr = [1,2,3];
			Array.prototype.reduce.call(arr, (s, i) => s + i)
			`,
			errors: [error]
		},
		{
			code: `
			var arr = [1,2,3];
			const sum = (s, i) => s + i;
			Array.prototype.reduce.call(arr, sum);
			`,
			errors: [error]
		}

	]
};

ruleTester.run('no-reduce', rule, tests);
babelRuleTester.run('no-reduce', rule, tests);
typescriptRuleTester.run('no-reduce', rule, tests);
