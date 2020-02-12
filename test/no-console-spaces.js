import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import {outdent} from 'outdent';
import rule from '../rules/no-console-spaces';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2020
	}
});

function buildError({method, column, line}) {
	const error = {
		ruleId: 'no-console-spaces',
		message: `Do not use leading/trailing space between \`console.${method}\` parameters.`
	};

	if (column) {
		error.column = column;
	}

	if (line) {
		error.line = line;
	}

	return error;
}

ruleTester.run('no-console-spaces', rule, {
	valid: [
		'console.log("abc");',
		'console.log("abc", "def");',
		'console.log(\'abc\', "def");',
		'console.log(`abc`, "def");',
		'console.log("abc", "def");',
		'console.log(`\nabc\ndef\n`);',

		'console.log(\' \', "def");',
		'console.log(\'  \', "def");',
		'console.log("abc  ", "def");',
		'console.log("abc\\t", "def");',
		'console.log("abc\\n", "def");',
		'console.log("  abc", "def");',

		'console.log(" abc", "def");',
		'console.log("abc", "def ");',

		'console.log();',
		'console.log("");',
		'console.log(123);',
		'console.log(null);',
		'console.log(undefined);',

		'console.dir("abc ");',

		// Not `CallExpression`
		'new console.log(" a ", " b ");',
		'new console.debug(" a ", " b ");',
		'new console.info(" a ", " b ");',
		'new console.warn(" a ", " b ");',
		'new console.error(" a ", " b ");',
		// Not `MemberExpression`
		'log(" a ", " b ");',
		'debug(" a ", " b ");',
		'info(" a ", " b ");',
		'warn(" a ", " b ");',
		'error(" a ", " b ");',
		// `callee.property` is not a `Identifier`
		'console["log"](" a ", " b ");',
		'console["debug"](" a ", " b ");',
		'console["info"](" a ", " b ");',
		'console["warn"](" a ", " b ");',
		'console["error"](" a ", " b ");',
		// Computed
		'console[log](" a ", " b ");',
		'console[debug](" a ", " b ");',
		'console[info](" a ", " b ");',
		'console[warn](" a ", " b ");',
		'console[error](" a ", " b ");',
		// Not listed method
		'console.foo(" a ", " b ");',
		// Not `console`
		'foo.log(" a ", " b ");',
		'foo.debug(" a ", " b ");',
		'foo.info(" a ", " b ");',
		'foo.warn(" a ", " b ");',
		'foo.error(" a ", " b ");',
		// `callee.object.type` is not a `Identifier`
		'lib.console.log(" a ", " b ");',
		'lib.console.debug(" a ", " b ");',
		'lib.console.info(" a ", " b ");',
		'lib.console.warn(" a ", " b ");',
		'lib.console.error(" a ", " b ");'
	],
	invalid: [
		{
			code: 'console.log("abc ", "def");',
			errors: [buildError({method: 'log'})],
			output: 'console.log("abc", "def");'
		},
		{
			code: 'console.log("abc", " def");',
			errors: [buildError({method: 'log'})],
			output: 'console.log("abc", "def");'
		},
		{
			code: 'console.log(" abc ", "def");',
			errors: [buildError({method: 'log'})],
			output: 'console.log(" abc", "def");'
		},
		{
			code: 'console.debug("abc ", "def");',
			errors: [buildError({method: 'debug'})],
			output: 'console.debug("abc", "def");'
		},
		{
			code: 'console.info("abc ", "def");',
			errors: [buildError({method: 'info'})],
			output: 'console.info("abc", "def");'
		},
		{
			code: 'console.warn("abc ", "def");',
			errors: [buildError({method: 'warn'})],
			output: 'console.warn("abc", "def");'
		},
		{
			code: 'console.error("abc ", "def");',
			errors: [buildError({method: 'error'})],
			output: 'console.error("abc", "def");'
		},
		{
			code: 'console.log("abc", " def ", "ghi");',
			errors: [buildError({method: 'log'})],
			output: 'console.log("abc", "def", "ghi");'
		},
		{
			code: 'console.log("abc ", "def ", "ghi");',
			errors: [
				buildError({method: 'log', column: 13}),
				buildError({method: 'log', column: 21})
			],
			output: 'console.log("abc", "def", "ghi");'
		},
		{
			code: 'console.log(\'abc \', "def");',
			errors: [buildError({method: 'log'})],
			output: 'console.log(\'abc\', "def");'
		},
		{
			code: 'console.log(`abc `, "def");',
			errors: [buildError({method: 'log'})],
			output: 'console.log(`abc`, "def");'
		},
		{
			// eslint-disable-next-line no-template-curly-in-string
			code: 'console.log(`abc ${1 + 2} `, "def");',
			errors: [buildError({method: 'log'})],
			// eslint-disable-next-line no-template-curly-in-string
			output: 'console.log(`abc ${1 + 2}`, "def");'
		},
		{
			code: outdent`
				console.log(
					'abc',
					'def ',
					'ghi'
				);
			`,
			errors: [
				buildError({method: 'log', column: 2, line: 3})
			],
			output: outdent`
				console.log(
					'abc',
					'def',
					'ghi'
				);
			`
		}
	]
});
