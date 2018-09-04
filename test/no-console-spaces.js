import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/no-console-spaces';

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2016
	}
});

function buildError({method, column, line}) {
	const error = {
		ruleId: 'no-console-spaces',
		message: `Do not include spaces in \`console.${method}\` parameters.`
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
		'console.log(\'abc\');',
		'console.log(`abc`);',
		'console.log("abc", "def");',
		'console.log(`\nabc\ndef\n`);',

		'console.log(\' \');',
		'console.log(\'  \');',
		'console.log("abc  ");',
		'console.log("abc\\t");',
		'console.log("abc\\n");',
		'console.log("  abc");',

		'console.log();',
		'console.log("");',
		'console.log(123);',
		'console.log(null);',
		'console.log(undefined);',

		'console.dir("abc ");'
	],
	invalid: [
		{
			code: 'console.log("abc ");',
			errors: [buildError({method: 'log'})],
			output: 'console.log("abc");'
		},
		{
			code: 'console.log(" abc");',
			errors: [buildError({method: 'log'})],
			output: 'console.log("abc");'
		},
		{
			code: 'console.log(" abc ");',
			errors: [buildError({method: 'log'})],
			output: 'console.log("abc");'
		},
		{
			code: 'console.debug("abc ");',
			errors: [buildError({method: 'debug'})],
			output: 'console.debug("abc");'
		},
		{
			code: 'console.info("abc ");',
			errors: [buildError({method: 'info'})],
			output: 'console.info("abc");'
		},
		{
			code: 'console.warn("abc ");',
			errors: [buildError({method: 'warn'})],
			output: 'console.warn("abc");'
		},
		{
			code: 'console.error("abc ");',
			errors: [buildError({method: 'error'})],
			output: 'console.error("abc");'
		},
		{
			code: 'console.log("abc", "def ");',
			errors: [buildError({method: 'log'})],
			output: 'console.log("abc", "def");'
		},
		{
			code: 'console.log("abc ", "def ");',
			errors: [
				buildError({method: 'log', column: 13}),
				buildError({method: 'log', column: 21})
			],
			output: 'console.log("abc", "def");'
		},
		{
			code: 'console.log(\'abc \');',
			errors: [buildError({method: 'log'})],
			output: 'console.log(\'abc\');'
		},
		{
			code: 'console.log(`abc `);',
			errors: [buildError({method: 'log'})],
			output: 'console.log(`abc`);'
		},
		{
			// eslint-disable-next-line no-template-curly-in-string
			code: 'console.log(` abc ${1 + 2} `);',
			errors: [buildError({method: 'log'})],
			// eslint-disable-next-line no-template-curly-in-string
			output: 'console.log(`abc ${1 + 2}`);'
		},
		{
			code: `
				console.log(
					'abc',
					'def '
				);
			`,
			errors: [
				buildError({method: 'log', column: 6, line: 4})
			],
			output: `
				console.log(
					'abc',
					'def'
				);
			`
		}
	]
});
