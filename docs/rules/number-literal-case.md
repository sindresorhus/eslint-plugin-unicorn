# number-literal-case

📝 Enforce proper case for numeric literals.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Differentiating the casing of the identifier and value clearly separates them and makes your code more readable.

- Lowercase radix identifier `0x` `0o` `0b` for [`Number`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type) and [`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#BigInt_type).
- Uppercase or lowercase hexadecimal value for [`Number`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type) and [`BigInt`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#BigInt_type).
- Lowercase `e` for exponential notation.

## Examples

[Hexadecimal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Hexadecimal)

```js
// ❌
const foo = 0XFF;

// ❌
const foo = 0xff;

// ❌
const foo = 0Xff;

// ✅
const foo = 0xFF;
```

```js
// ❌
const foo = 0Xffn;

// ✅
const foo = 0xFFn;
```

[Binary](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Binary)

```js
// ❌
const foo = 0B10;

// ✅
const foo = 0b10;
```

```js
// ❌
const foo = 0B10n;

// ✅
const foo = 0b10n;
```

[Octal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Octal)

```js
// ❌
const foo = 0O76;

// ✅
const foo = 0o76;
```

```js
// ❌
const foo = 0O76n;

// ✅
const foo = 0o76n;
```

[Exponential notation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#Exponential)

```js
// ❌
const foo = 2E-5;

// ✅
const foo = 2e-5;
```

```js
// ❌
const foo = 2E+5;

// ✅
const foo = 2e+5;
```

```js
// ❌
const foo = 2E5;

// ✅
const foo = 2e5;
```

## Options

Type: `object`

### hexadecimalValue

Type: `'uppercase' | 'lowercase'`\
Default: `'uppercase'`

Specify whether the hexadecimal number value (ABCDEF) should be in `uppercase` or `lowercase`.

Note: `0x` is always lowercase and not controlled by this option to maintain readable code.

Example:

```js
{
	'unicorn/number-literal-case': [
		'error',
		{
			hexadecimalValue: 'lowercase',
		}
	]
}
```

```js
// ❌
const foo = 0XFF;
const foo = 0xFF;
const foo = 0XFFn;
const foo = 0xFFn;

// ✅
const foo = 0xff;
const foo = 0xffn;
```
