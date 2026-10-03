# Writing tests

Tests are in the `/test` directory.

A rule test file should look like this:

```js
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Valid test cases goes here
	],
	invalid: [
		// Valid test cases goes here
	],
});
```

## `test.snapshot()`

This runs [`SnapshotRuleTester`](../test/utils/snapshot-rule-tester.js), which auto-generates the snapshot for test results, including error messages, error locations, autofix result, and suggestions. All you have to do is check the snapshot and make sure the results are expected before committing.

It's recommended to use this approach as it simplifies test writing.

```js
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'valid.code',
	],
	invalid: [
		'invalid.code',
	],
});
```

## Focus on one rule

We use the built-in [Node.js test runner](https://nodejs.org/api/test.html) (Node.js 22.13 or later) to run tests. To focus on a specific rule test, you can:

```console
node --test test/rule-name.js
```

A new snapshot test case fails until its snapshot exists. To create or update snapshots, run the command above with [`--test-update-snapshots`](https://nodejs.org/api/cli.html#--test-update-snapshots):

```console
node --test --test-update-snapshots test/rule-name.js
```

Snapshots are saved in `test/snapshots/rule-name.js.snapshot`.

## Focus on one test case

To focus on a single test case, you can:

```js
test.snapshot({
	valid: [],
	invalid: [
		// Tagged template with `test.only`
		test.only`code`,

		// Wrap code with `test.only`
		test.only('code'),

		// Wrap test case with `test.only`
		test.only({
			code: 'code',
			options: [{checkFoo: true}],
		}),

		// Use `only: true`
		{
			code: 'code',
			options: [{checkFoo: true}],
			only: true,
		},
	],
})
```

Then run the tests with [`--test-only`](https://nodejs.org/api/cli.html#--test-only):

```console
node --test --test-only test/rule-name.js
```

> [!WARNING]
> Do not update snapshots while `test.only` is used. The update rewrites the whole snapshot file, so the snapshots of the other test cases are deleted.

**Please remove `test.only` and `only: true` before committing.**

## `test()`

This runs ESLint's [`RuleTester`](https://eslint.org/docs/latest/integrate/nodejs-api#ruletester):

```js
import {getTester} from './utils/test.js';

const {test} = getTester(import.meta);

test({
	valid: [
		'valid.code',
	],
	invalid: [
		{
			code: 'invalid.code',
			errors: [{ message: 'invalid.code is not allowed', column: 1, line: 1 }],
			output: 'fixed.code',
		}
	],
});
```

## `test.typescript()`

Same as `test()`, but uses [`@typescript-eslint/parser`](https://www.npmjs.com/package/@typescript-eslint/parser) as parser.

## `test.vue()`

Same as `test()`, but uses [`vue-eslint-parser`](https://www.npmjs.com/package/vue-eslint-parser) as parser.

## `testerOptions`

`test` and `test.*()` accepts `testerOptions`, which lets you specify common `parseOptions` to all test cases.

```js
test.snapshot({
	testerOptions: {
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	},
	valid: [],
	invalid: [],
})
```

## `parsers`

[`utils/test.js`](../test/utils/test.js) also exposes a `parsers` object, which can be used in `testerOptions` or `parser` for a single test case.

```js
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	testerOptions: {
		languageOptions: {
			parser: parsers.typescript,
		},
	},
	valid: [],
	invalid: [],
})
```

```js
import {getTester, parsers} from './utils/test.js';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [],
	invalid: [
		{
			code: 'const foo = 1 as const;',
			languageOptions: {
				parser: parsers.typescript,
			},
		},
	],
})
```

Why use `parser: parsers.typescript` instead of `parser: '@typescript-eslint/parser'`?

Using `parsers.typescript` will make the `parserOptions` merge with useful default options. See [`parsers.js`](../test/utils/parsers.js) for details.
