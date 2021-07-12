import outdent from 'outdent';
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

function buildError({method, position}) {
	return {
		messageId: 'no-console-spaces',
		data: {method, position},
	};
}

test({
	valid: [
		'console.log("abc");',
		'console.log("abc", "def");',
		'console.log(\'abc\', "def");',
		'console.log(`abc`, "def");',
		'console.log("abc", "def");',
		'console.log(`\nabc\ndef\n`);',

		'console.log(\' \', "def");',

		// Exactly one space
		'console.log(" ");',
		'console.log(" ", "b");',
		'console.log("a", " ");',
		'console.log(" ", "b", "c");',
		'console.log("a", " ", "c");',
		'console.log("a", "b", " ");',

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
		'lib.console.error(" a ", " b ");',
	],
	invalid: [
		{
			code: 'console.log("abc ", "def");',
			errors: [buildError({method: 'log', position: 'trailing'})],
			output: 'console.log("abc", "def");',
		},
		{
			code: 'console.log("abc", " def");',
			errors: [buildError({method: 'log', position: 'leading'})],
			output: 'console.log("abc", "def");',
		},
		{
			code: 'console.log(" abc ", "def");',
			errors: [buildError({method: 'log', position: 'trailing'})],
			output: 'console.log(" abc", "def");',
		},
		{
			code: 'console.debug("abc ", "def");',
			errors: [buildError({method: 'debug', position: 'trailing'})],
			output: 'console.debug("abc", "def");',
		},
		{
			code: 'console.info("abc ", "def");',
			errors: [buildError({method: 'info', position: 'trailing'})],
			output: 'console.info("abc", "def");',
		},
		{
			code: 'console.warn("abc ", "def");',
			errors: [buildError({method: 'warn', position: 'trailing'})],
			output: 'console.warn("abc", "def");',
		},
		{
			code: 'console.error("abc ", "def");',
			errors: [buildError({method: 'error', position: 'trailing'})],
			output: 'console.error("abc", "def");',
		},
		{
			code: 'console.log("abc", " def ", "ghi");',
			errors: [
				buildError({method: 'log', position: 'leading'}),
				buildError({method: 'log', position: 'trailing'}),
			],
			output: 'console.log("abc", "def", "ghi");',
		},
		{
			code: 'console.log("abc ", "def ", "ghi");',
			errors: [
				buildError({method: 'log', position: 'trailing'}),
				buildError({method: 'log', position: 'trailing'}),
			],
			output: 'console.log("abc", "def", "ghi");',
		},
		{
			code: 'console.log(\'abc \', "def");',
			errors: [buildError({method: 'log', position: 'trailing'})],
			output: 'console.log(\'abc\', "def");',
		},
		{
			code: 'console.log(`abc `, "def");',
			errors: [buildError({method: 'log', position: 'trailing'})],
			output: 'console.log(`abc`, "def");',
		},
		{
			// eslint-disable-next-line no-template-curly-in-string
			code: 'console.log(`abc ${1 + 2} `, "def");',
			errors: [buildError({method: 'log', position: 'trailing'})],
			// eslint-disable-next-line no-template-curly-in-string
			output: 'console.log(`abc ${1 + 2}`, "def");',
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
				buildError({method: 'log', position: 'trailing'}),
			],
			output: outdent`
				console.log(
					'abc',
					'def',
					'ghi'
				);
			`,
		},
		// https://github.com/facebook/react/blob/dbb060d561b83ad901af3e1f60541e6c313cca4f/scripts/release/shared-commands/test-packaging-fixture.js#L69
		{
			code: outdent`
				console.error(
					theme.error('✗'),
					'Verifying "packaging" fixture\\n ',
					theme.error(errorMessage)
				);
			`,
			errors: [
				buildError({method: 'error', position: 'trailing'}),
			],
			output: outdent`
				console.error(
					theme.error('✗'),
					'Verifying "packaging" fixture\\n',
					theme.error(errorMessage)
				);
			`,
		},
	],
});

test.snapshot({
	valid: [],
	invalid: [
		'console.log("abc", " def ", "ghi");',
		outdent`
			console.error(
				theme.error('✗'),
				'Verifying "packaging" fixture\\n ',
				theme.error(errorMessage)
			);
		`,
		outdent`
			console.log(
				'abc',
				'def ',
				'ghi'
			);
		`,
		'console.log("_", " leading", "_")',
		'console.log("_", "trailing ", "_")',
		'console.log("_", " leading and trailing ", "_")',
		'console.log("_", " log ", "_")',
		'console.debug("_", " debug ", "_")',
		'console.info("_", " info ", "_")',
		'console.warn("_", " warn ", "_")',
		'console.error("_", " error ", "_")',
	],
});
