# prefer-string-starts-ends-with

📝 Prefer `String#startsWith()` & `String#endsWith()` over regexes, `String#indexOf() === 0`, and slice checks.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer [`String#startsWith()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith) and [`String#endsWith()`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith) over using a regex with `/^foo/` or `/foo$/`.

This rule also detects `String#indexOf() === 0` when the receiver is provably a string (via literals, `String()` calls, TypeScript type annotations, etc.).

This rule also detects string slice comparisons like `string.slice(0, prefix.length) === prefix` and `string.slice(-5) === 'value'`. Dynamic suffix length checks are only reported when the suffix value is statically known to be non-empty, because `string.slice(-suffix.length) === suffix` is not equivalent to `string.endsWith(suffix)` when `suffix` is an empty string.

Some reports are not autofixable when the replacement could change behavior or remove comments.

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
const foo = 'barbaz'.slice(0, 3) === 'bar';

// ✅
const foo = 'barbaz'.startsWith('bar');
```

```js
// ❌
const foo = 'foobaz'.slice(-3) === 'baz';

// ✅
const foo = 'foobaz'.endsWith('baz');
```

```js
// ✅
const foo = /^bar/i.test(baz);
```
