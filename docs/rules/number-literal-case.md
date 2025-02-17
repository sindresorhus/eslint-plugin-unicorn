# Enforce proper case for numeric literals

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Differentiating the casing of the identifier and value clearly separates them and makes your code more readable. The default style is:

- Lowercase identifier and uppercase value for [`Number`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type) and [`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#BigInt_type).
- Lowercase `e` for exponential notation.

## Fail

[Hexadecimal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Hexadecimal)

```js
const foo = 0XFF;
const foo = 0xff;
const foo = 0Xff;
const foo = 0Xffn;
```

[Binary](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Binary)

```js
const foo = 0B10;
const foo = 0B10n;
```

[Octal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Octal)

```js
const foo = 0O76;
const foo = 0O76n;
```

Exponential notation

```js
const foo = 2E-5;
```

## Pass

```js
const foo = 0xFF;
```

```js
const foo = 0b10;
```

```js
const foo = 0o76;
```

```js
const foo = 0xFFn;
```

```js
const foo = 2e+5;
```

## Options

Type: `object`

Default options:

```js
{
	'unicorn/number-literal-case': [
		'error',
		{
			hexadecimalValue: 'uppercase',
			radixIdentifier: 'lowercase',
			exponentialNotation: 'lowercase'
		}
	]
}
```

### hexadecimalValue

Type: `'uppercase' | 'lowercase' | 'ignore'`\
Default: `'uppercase'`

Specify whether the hexadecimal number value (ABCDEF) should be in `uppercase`, `lowercase`, or `ignore` the check. Defaults to `'uppercase'`.

Example:
```js
// eslint unicorn/number-literal-case: ["error", {"hexadecimalValue": "lowercase"}]

// Fail
const foo = 0XFF;
const foo = 0xFF;
const foo = 0XFFn;
const foo = 0xFFn;

// Pass
const foo = 0Xff;
const foo = 0xff;
const foo = 0Xffn;
const foo = 0xffn;
```

### radixIdentifier

Type: `'uppercase' | 'lowercase' | 'ignore'`\
Default: `'lowercase'`

Specify whether the radix indentifer (`0x`, `0o`, `0b`) should be in `uppercase`, `lowercase`, or `ignore` the check. Defaults to `'lowercase'`.

Example:
```js
// eslint unicorn/number-literal-case: ["error", {"radixIdentifier": "uppercase"}]

// Fail
const foo = 0xFF;
const foo = 0o76;
const foo = 0b10;
const foo = 0xFFn;
const foo = 0o76n;
const foo = 0b10n;

// Pass
const foo = 0XFF;
const foo = 0O76;
const foo = 0B10;
const foo = 0XFFn;
const foo = 0O76n;
const foo = 0B10n;
```

### exponentialNotation

Type: `'uppercase' | 'lowercase' | 'ignore'`\
Default: `'lowercase'`

Specify whether the exponential notation (`e`) should be in `uppercase`, `lowercase`, or `ignore` the check. Defaults to `'lowercase'`.

Example:
```js
// eslint unicorn/number-literal-case: ["error", {"exponentialNotation": "uppercase"}]

// Fail
const foo = 2e-5;
const foo = 2e+5;
const foo = 2e99;

// Pass
const foo = 2E-5;
const foo = 2E+5;
const foo = 2E99;
```
