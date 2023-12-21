# Writing tests

Tests are in `/test` directory.

A rule test file should code like following:

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

This runs [`SnapshotRuleTester`](../test/utils/snapshot-rule-tester.mjs) which auto generates the snapshot for test results including error messages, error locations, autofix result, suggestions. All you have to do is check the snapshot and make sure the results are expected before commit.

This is recommended to use, since it's much easier to write tests.

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

## Focus one rule

We use [`AVA`](https://github.com/avajs/ava) to run tests. To focus a rule tests, you can:

```console
npx ava test/rule-name.mjs
```

## Focus one test case

To focus a single test case, you can:

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

**Please remove `test.only` and `only: true` before commit.**

## `test()`

This runs [`eslint-ava-rule-tester`](https://github.com/jfmengels/eslint-ava-rule-tester), example:

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

This is same as `test()`, but use [`@babel/eslint-parser`](https://www.npmjs.com/package/@babel/eslint-parser) as parser.

## `test.typescript()`

This is same as `test()`, but use [`@typescript-eslint/parser`](https://www.npmjs.com/package/@typescript-eslint/parser) as parser.

## `test.vue()`

This is same as `test()`, but use [`vue-eslint-parser`](https://www.npmjs.com/package/vue-eslint-parser) as parser.

## `testerOptions`

`test` and `test.*()` accepts `testerOptions`, which can supply common parseOptions to all test cases.

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

[`utils/test.mjs`](../test/utils/test.mjs) also expose a `parsers` object which can be use in `testerOptions` or `parser` for single test case.

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

Use `parsers.babel` will make the `parserOptions` merge with useful default options, see [`parser.mjs`](../test/utils/parsers.mjs) for details.
