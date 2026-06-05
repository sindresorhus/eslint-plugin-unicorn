# no-duplicate-set-values

📝 Disallow duplicate values in `Set` constructor array literals.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->

`Set` values are unique, so repeated static values in a `Set` constructor array literal are redundant.

This rule also reports repeated reference expressions, like `foo.bar`. It does not model mutations or side effects between elements.

## Examples

```js
// ❌
const set = new Set([
	'foo',
	'bar',
	'foo',
]);

// ✅
const set = new Set([
	'foo',
	'bar',
]);
```

```js
// ❌
const foo = 2;
const set = new Set([foo, 2]);

// ✅
const foo = 2;
const set = new Set([foo, 3]);
```

```js
// ❌
const set = new Set([foo.bar, foo.bar]);

// ✅
const set = new Set([foo.bar, foo.baz]);
```

This rule only checks `new Set([...])` with an array literal argument. It does not check arrays, maps, non-array iterables, or chained `Set#add()` calls.
