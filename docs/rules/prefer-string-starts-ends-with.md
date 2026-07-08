# prefer-string-starts-ends-with

📝 Prefer `String#startsWith()` & `String#endsWith()` over regexes, `String#indexOf() === 0`, and slice checks.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer [`String#startsWith()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith) and [`String#endsWith()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith) over using a regex with `/^foo/` or `/foo$/`.

This rule also detects `String#indexOf() === 0` when the receiver is provably a string (via literals, `String()` calls, TypeScript type annotations, etc.).

This rule also detects string slice comparisons like `string.slice(0, prefix.length) === prefix` and `string.slice(-5) === 'value'`. Dynamic suffix length checks are reported but not autofixed because `string.slice(-suffix.length) === suffix` is not equivalent to `string.endsWith(suffix)` when `suffix` is an empty string.

This rule is fixable, unless the matching object is known not a string.

## Examples

```js
// ❌
const foo = /^bar/.test(baz);

// ✅
const foo = baz.startsWith('bar');
```

```js
// ❌
const foo = /bar$/.test(baz);

// ✅
const foo = baz.endsWith('bar');
```

```js
// ❌
const foo = someString.indexOf('bar') === 0;

// ✅
const foo = someString.startsWith('bar');
```

```js
// ❌
const foo = someString.slice(0, 3) === 'bar';

// ✅
const foo = someString.startsWith('bar');
```

```js
// ❌
const foo = someString.slice(-3) === 'bar';

// ✅
const foo = someString.endsWith('bar');
```

```js
// ✅
const foo = /^bar/i.test(baz);
```
