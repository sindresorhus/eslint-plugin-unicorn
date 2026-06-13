# consistent-optional-chaining

📝 Enforce consistent optional chaining for same-base member access.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

Enforce consistent optional chaining for same-base member access in logical expressions.

This rule intentionally handles only direct member access on both sides of `&&` or `||`. It does not rewrite broad truthiness checks like `foo && foo.bar` to `foo?.bar`, because that can change runtime values.

## Examples

```js
// ❌
foo?.bar || foo.baz;

// ✅
foo?.bar || foo?.baz;
```

```js
// ❌
foo.bar || foo?.baz;

// ✅
foo.bar || foo.baz;
```

```js
// ❌
foo?.bar && foo?.baz;

// ✅
foo?.bar && foo.baz;
```

```js
// ❌
foo.bar && foo?.baz;

// ✅
foo.bar && foo.baz;
```
