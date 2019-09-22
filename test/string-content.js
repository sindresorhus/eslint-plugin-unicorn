import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/string-content';

const ruleTester = avaRuleTester(test, {
	env: {
		es6: true
	}
});

function stringContentError(match, suggest) {
	return {
		ruleId: 'string-content',
		message: `Use \`${suggest}\` instead of \`${match}\`.`
	};
}

function testCase(code, output, options, errors) {
	return {
		code,
		options,
		output,
		errors
	};
}

ruleTester.run('string-content', rule, {
	valid: [
		{
			code: 'const foo = "eslint-plugin-🦄";',
			options: [
				{
					match: 'unicorn',
					suggest: '🦄',
					fix: true
				}
			]
		},
		{
			code: 'const foo = "eslint-plugin-🦄";',
			options: [
				{
					match: 'unicorn',
					suggest: '🦄',
					fix: true
				},
				{
					match: '_',
					suggest: '-',
					fix: true
				}
			]
		},
		{
			code: 'const foo = "eslint-plugin-🦄";',
			options: [
				{
					match: 'unicorn',
					suggest: '🦄',
					fix: true
				},
				{
					match: '_',
					suggest: '-',
					fix: true
				}
			]
		},
		{
			code: 'const foo = `${"eslint"}-${"plugin"}-${"🦄"}`;',
			options: [
				{
					match: 'unicorn',
					suggest: '🦄',
					fix: true
				}
			]
		},
		{
			code: 'const foo = { "🦄": "🦄" };',
			options: [
				{
					match: 'unicorn',
					suggest: '🦄',
					fix: true
				}
			]
		}
	],
	invalid: [
		testCase(
			'const foo = "eslint-plugin-unicorn";',
			'const foo = "eslint-plugin-🦄";',
			[
				{
					match: 'unicorn',
					suggest: '🦄',
					fix: true
				}
			],
			[stringContentError('unicorn', '🦄')],
		),
		testCase(
			'const foo = "eslint_plugin_unicorn";',
			'const foo = "eslint-plugin-🦄";',
			[
				{
					match: 'unicorn',
					suggest: '🦄',
					fix: true
				},
				{
					match: '_',
					suggest: '-',
					fix: true
				}
			],
			[stringContentError('unicorn', '🦄'), stringContentError('_', '-')],
		),
		testCase(
			'const foo = `${"eslint"}-${"plugin"}-${"unicorn"}`;',
			'const foo = `${"eslint"}-${"plugin"}-${"🦄"}`;',
			[
				{
					match: 'unicorn',
					suggest: '🦄',
					fix: true
				}
			],
			[stringContentError('unicorn', '🦄')],
		),
		testCase(
			'const foo = { "unicorn": "unicorn" };',
			'const foo = { "🦄": "🦄" };',
			[
				{
					match: 'unicorn',
					suggest: '🦄',
					fix: true
				}
			],
			[stringContentError('unicorn', '🦄'), stringContentError('unicorn', '🦄')],
		)
	]
});
