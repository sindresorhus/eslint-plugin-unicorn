import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule, { buildErrorMessage } from '../rules/no-space-in-console';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2016
	}
});

function buildError({method, column, line}) {
	return {
		ruleId: 'no-space-in-console',
		message: `Do not include spaces in \`console.${method}\` parameters.`,
		column,
		line,
	};
}

ruleTester.run('no-space-in-console', rule, {
	valid: [
		'console.log("abc");',
		"console.log('abc');",
		'console.log(`abc`);',
		'console.log("abc", "def");',
		'console.log(`abc `);',
		'console.log(`\nabc\ndef\n`);',

		'console.log();',
		'console.log("");',
		'console.log(123);',
		'console.log(null);',
		'console.log(undefined);',

		'console.dir("abc ");',
	],
	invalid: [
		{
			code: 'console.log("abc ");',
			errors: [
				buildError({ method: 'log', column: 13, line: 1}),
			],
			output: 'console.log("abc");'
		},
		{
			code: 'console.log("abc  ");',
			errors: [
				buildError({ method: 'log', column: 13, line: 1}),
			],
			output: 'console.log("abc");'
		},
		{
			code: 'console.log("abc\\t");',
			errors: [
				buildError({ method: 'log', column: 13, line: 1}),
			],
			output: 'console.log("abc");'
		},
		{
			code: 'console.log(" abc");',
			errors: [
				buildError({ method: 'log', column: 13, line: 1}),
			],
			output: 'console.log("abc");'
		},
		{
			code: 'console.log("abc\\n");',
			errors: [
				buildError({ method: 'log', column: 13, line: 1}),
			],
			output: 'console.log("abc");'
		},
		{
			code: 'console.warn("abc ");',
			errors: [
				buildError({ method: 'warn', column: 14, line: 1}),
			],
			output: 'console.warn("abc");'
		},
		{
			code: 'console.error("abc ");',
			errors: [
				buildError({ method: 'error', column: 15, line: 1}),
			],
			output: 'console.error("abc");'
		},
		{
			code: 'console.log("abc", "def ");',
			errors: [
				buildError({ method: 'log', column: 20, line: 1}),
			],
			output: 'console.log("abc", "def");'
		},
		{
			code: 'console.log("abc ", "def ");',
			errors: [
				buildError({ method: 'log', column: 13, line: 1}),
				buildError({ method: 'log', column: 21, line: 1}),
			],
			output: 'console.log("abc", "def");'
		},
		{
			code: "console.log('abc ');",
			errors: [
				buildError({ method: 'log', column: 13, line: 1}),
			],
			output: "console.log('abc');"
		},
		{
			code: `
				console.log(
					'abc',
					'def '
				);
			`,
			errors: [
				buildError({ method: 'log', column: 6, line: 4}),
			],
			output: `
				console.log(
					'abc',
					'def'
				);
			`
		},
	]
});
