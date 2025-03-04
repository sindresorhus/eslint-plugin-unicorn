# Require escape sequences to use uppercase values

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces a consistent escaped value style by defining escape sequence values with uppercase or lowercase characters. The default style is uppercase, which promotes readability by making the escaped value more distinguishable from the identifier.

## Examples

```js
// ❌
const foo = '\xa9';

// ✅
const foo = '\xA9';
```

```js
// ❌
const foo = '\ud834';

// ✅
const foo = '\uD834';
```

```js
// ❌
const foo = '\u{1d306}';

// ✅
const foo = '\u{1D306}';
```

```js
// ❌
const foo = '\ca';

// ✅
const foo = '\cA';
```

## Options

Type: `string`\
Default: `'uppercase'`

- `'uppercase'` (default)
  - Always use escape sequence values with uppercase characters.
- `'lowercase'`
  - Always use escape sequence values with lowercase characters.

Example:

```js
{
	'unicorn/escape-case': ['error', 'lowercase']
}
```

```js
// ❌
const foo = '\xA9';

// ✅
const foo = '\xa9';
```

```js
// ❌
const foo = '\uD834';

// ✅
const foo = '\ud834';
```

```js
// ❌
const foo = '\u{1D306}';

// ✅
const foo = '\u{1d306}';
```

```js
// ❌
const foo = '\cA';

// ✅
const foo = '\ca';
```
