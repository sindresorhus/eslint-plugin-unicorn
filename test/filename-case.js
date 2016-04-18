import test from 'ava';
import {RuleTester} from 'eslint';
import rule from '../rules/filename-case';

const ruleTester = new RuleTester({
	env: {
		es6: true
	}
});

function testCase(filename, chosenCase, errorMessage) {
	return {
		code: 'foo()',
		filename: filename,
		options: [{case: chosenCase}],
		errors: errorMessage && [{
			ruleId: 'filename-case',
			message: errorMessage
		}]
	};
}

test(() => {
	ruleTester.run('filename-case', rule, {
		valid: [
			testCase('src/foo/bar.js', 'camelCase'),
			testCase('src/foo/fooBar.js', 'camelCase'),
			testCase('src/foo/bar.test.js', 'camelCase'),
			testCase('src/foo/fooBar.test.js', 'camelCase'),
			testCase('src/foo/fooBar.testUtils.js', 'camelCase'),
			testCase('src/foo/foo.js', 'snakeCase'),
			testCase('src/foo/foo_bar.js', 'snakeCase'),
			testCase('src/foo/foo.test.js', 'snakeCase'),
			testCase('src/foo/foo_bar.test.js', 'snakeCase'),
			testCase('src/foo/foo_bar.test_utils.js', 'snakeCase'),
			testCase('src/foo/foo.js', 'kebabCase'),
			testCase('src/foo/foo-bar.js', 'kebabCase'),
			testCase('src/foo/foo.test.js', 'kebabCase'),
			testCase('src/foo/foo-bar.test.js', 'kebabCase'),
			testCase('src/foo/foo-bar.test-utils.js', 'kebabCase')
		],
		invalid: [
			testCase('src/foo/foo_bar.js',
				undefined,
				'Filename is not in camel case. Rename it to `fooBar.js`.'
			),
			testCase('src/foo/foo_bar.js',
				'camelCase',
				'Filename is not in camel case. Rename it to `fooBar.js`.'
			),
			testCase('src/foo/foo_bar.test.js',
				'camelCase',
				'Filename is not in camel case. Rename it to `fooBar.test.js`.'
			),
			testCase('test/foo/foo_bar.test_utils.js',
				'camelCase',
				'Filename is not in camel case. Rename it to `fooBar.testUtils.js`.'
			),
			testCase('test/foo/fooBar.js',
				'snakeCase',
				'Filename is not in snake case. Rename it to `foo_bar.js`.'
			),
			testCase('test/foo/fooBar.test.js',
				'snakeCase',
				'Filename is not in snake case. Rename it to `foo_bar.test.js`.'
			),
			testCase('test/foo/fooBar.testUtils.js',
				'snakeCase',
				'Filename is not in snake case. Rename it to `foo_bar.test_utils.js`.'
			),
			testCase('test/foo/fooBar.js',
				'kebabCase',
				'Filename is not in kebab case. Rename it to `foo-bar.js`.'
			),
			testCase('test/foo/fooBar.test.js',
				'kebabCase',
				'Filename is not in kebab case. Rename it to `foo-bar.test.js`.'
			),
			testCase('test/foo/fooBar.testUtils.js',
				'kebabCase',
				'Filename is not in kebab case. Rename it to `foo-bar.test-utils.js`.'
			)
		]
	});
});
