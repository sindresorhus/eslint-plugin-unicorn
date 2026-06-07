# no-incorrect-query-selector

📝 Disallow incorrect `querySelector()` and `querySelectorAll()` usage.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule catches common incorrect or inefficient `querySelector()` and `querySelectorAll()` usage.

## Examples

```js
// ❌
document.querySelectorAll('form')[0];

// ✅
document.querySelector('form');
```

```js
// ❌
document.querySelectorAll('form').at(0);

// ✅
document.querySelector('form');
```

```js
// ❌
document.querySelectorAll('#foo');

// ✅
document.querySelector('#foo');
```

```js
// ❌
if (document.querySelectorAll('.item')) {}

// ✅
if (document.querySelectorAll('.item').length > 0) {}
```

```js
// ❌
const elements = document.querySelectorAll('.item');
if (elements) {}

// ✅
const elements = document.querySelectorAll('.item');
if (elements.length > 0) {}
```

```js
// ❌
document.querySelectorAll('.item') === null;

// ✅
// If you meant "no matches":
document.querySelectorAll('.item').length === 0;
```

```js
// ❌
document.querySelector('.item') === undefined;

// ✅
// If you meant "no match":
document.querySelector('.item') === null;
```

## Limitations

This rule intentionally only checks simple, common cases. It does not validate CSS selectors, simplify selectors, or enforce `:scope`.

When fixing first-match access, no-match results change from `undefined` to `null`, matching `querySelector()` behavior.
