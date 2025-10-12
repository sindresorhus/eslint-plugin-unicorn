import outdent from 'outdent';
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

const TEST_STRING = String.raw`"a\\b"`;

test.snapshot({
	valid: [
		String.raw`a = '\''`,
		outdent`
			a = "\\\\a \\
				b"
		`,
		String.raw`a = 'a\\b\u{51}c'`,
		'a = "a\\\\b`"',
		// eslint-disable-next-line no-template-curly-in-string
		'a = "a\\\\b${foo}"',
		String.raw`a = '\\'`,
		String.raw`a = 'a\\b\"'`,
	],
	invalid: [
		String.raw`a = 'a\\b'`,
		String.raw`a = {['a\\b']: b}`,
		String.raw`function a() {return'a\\b'}`,
		String.raw`const foo = "foo \\x46";`,
		String.raw`a = 'a\\b\''`,
		String.raw`a = "a\\b\""`,
	],
});

// Restricted places
test.typescript({
	valid: [
		// Directive
		String.raw`${TEST_STRING};`,
		// Module source
		String.raw`import ${TEST_STRING};`,
		String.raw`export {} from ${TEST_STRING};`,
		String.raw`export * from ${TEST_STRING};`,
		// Property key
		String.raw`({${TEST_STRING}: 1})`,
		// JSX attribute value
		{
			code: String.raw`<Component attribute=${TEST_STRING} />`,
			languageOptions: {
				parserOptions: {
					ecmaFeatures: {
						jsx: true,
					},
				},
			},
		},
		// Import attribute key and value
		String.raw`import "m" with {${TEST_STRING}: ${TEST_STRING}}`,
		String.raw`export {} from "m" with {${TEST_STRING}: ${TEST_STRING}}`,
		// Enum member key and value
		String.raw`enum E {${TEST_STRING} = ${TEST_STRING}}`,
	],
	invalid: [],
});
