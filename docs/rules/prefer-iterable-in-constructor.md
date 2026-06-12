# prefer-iterable-in-constructor

📝 Prefer passing iterables directly to constructors instead of filling empty collections.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Some built-in constructors accept the values they should contain. Creating an empty collection and immediately filling it with a `for…of` loop is unnecessary when the constructor can consume the iterable directly.

This rule reports simple adjacent loops that fill an empty `Set`, `WeakSet`, `Map`, `WeakMap`, or `URLSearchParams`. It also reports `new URLSearchParams(Object.entries(record))`.

`URLSearchParams` is only reported for `Object.entries(record)` because `new URLSearchParams(record)` can consume string-keyed records directly. The rule skips obvious non-record sources like arrays, strings, nullish values, primitive numbers, and constructor calls. Generic pair iterables are intentionally not reported for `URLSearchParams#set()` because duplicate names can make the loop behavior differ from constructor behavior.

`FormData` is intentionally unsupported because its constructor accepts a form and optional submitter, not arbitrary entries.

Exotic custom iterator behavior, symbol-keyed records hidden behind variables, and shadowed built-ins are intentionally unsupported. The rule skips direct object literals with computed properties and direct `Map` array literals that are not array pairs, but it does not try to prove whether variables contain custom iterables or symbol keys.

## Examples

```js
// ❌
const set = new Set();
for (const item of items) {
	set.add(item);
}

// ✅
const set = new Set(items);
```

```js
// ❌
const map = new Map();
for (const [key, value] of entries) {
	map.set(key, value);
}

// ✅
const map = new Map(entries);
```

```js
// ❌
const searchParameters = new URLSearchParams();
for (const [key, value] of Object.entries(record)) {
	searchParameters.set(key, value);
}

// ✅
const searchParameters = new URLSearchParams(record);
```

```js
// ❌
const searchParameters = new URLSearchParams(Object.entries(record));

// ✅
const searchParameters = new URLSearchParams(record);
```

```js
// ✅ because generic pair iterables can behave differently with duplicate names
const searchParameters = new URLSearchParams();
for (const [key, value] of entries) {
	searchParameters.set(key, value);
}
```
