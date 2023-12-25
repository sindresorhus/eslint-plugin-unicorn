# Writing tests

Tests are in the `/test` directory.

A rule test file should look like this:

```js
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		// Valid test cases goes here
	],
	invalid: [
		// Valid test cases goes here
	]，
});
```

## `test.snapshot()`

This runs [`SnapshotRuleTester`](../test/utils/snapshot-rule-tester.mjs), which auto-generates the snapshot for test results, including error messages, error locations, autofix result, and suggestions. All you have to do is check the snapshot and make sure the results are expected before committing.

This is recommended to use, since it makes it much easier to write tests.

```js
import {getTester} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [
		'valid.code',
	],
	invalid: [
		'invalid.code',
	]，
});
```

## Focus on one rule

We use [`AVA`](https://github.com/avajs/ava) to run tests. To focus on a specific rule test, you can:

```console
npx ava test/rule-name.mjs
```

To update snapshots, run the command above with [`--update-snapshots` or `-u`](https://github.com/avajs/ava/blob/main/docs/05-command-line.md#cli).

```console
npx ava test/rule-name.mjs -u
```

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

**Please remove `test.only` and `only: true` before committing.**

## `test()`

This runs [`eslint-ava-rule-tester`](https://github.com/jfmengels/eslint-ava-rule-tester):

```js
import {getTester} from './utils/test.mjs';

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
	]，
});
```

## `test.babel()`

Same as `test()`, but uses [`@babel/eslint-parser`](https://www.npmjs.com/package/@babel/eslint-parser) as parser.

## `test.typescript()`

Same as `test()`, but uses [`@typescript-eslint/parser`](https://www.npmjs.com/package/@typescript-eslint/parser) as parser.

## `test.vue()`

Same as `test()`, but uses [`vue-eslint-parser`](https://www.npmjs.com/package/vue-eslint-parser) as parser.

## `testerOptions`

`test` and `test.*()` accepts `testerOptions`, which lets you specify common `parseOptions` to all test cases.

```js
test.snapshot({
	testerOptions: {
		parserOptions: {
			ecmaFeatures: {
				jsx: true,
			},
		},
	},
	valid: [],
	invalid: [],
})
```

## `parsers`

[`utils/test.mjs`](../test/utils/test.mjs) also exposes a `parsers` object, which can be used in `testerOptions` or `parser` for a single test case.

```js
import {getTester, parsers} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	testerOptions: {
		parser: parsers.babel,
	},
	valid: [],
	invalid: [],
})
```

```js
import {getTester, parsers} from './utils/test.mjs';

const {test} = getTester(import.meta);

test.snapshot({
	valid: [],
	invalid: [
		{
			code: 'invalid.code.parse.by.babel',
			parser: parsers.babel,
		},
	],
})
```

Why use `parser: parsers.babel` instead of `parser: '@babel/eslint-parser'`?

Using `parsers.babel` will make the `parserOptions` merge with useful default options. See [`parser.mjs`](../test/utils/parsers.mjs) for details.
