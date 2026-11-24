# prefer-map-get

📝 Prefer reusing the result of `Map#get()` when checking and reading an entry.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

💭 This rule requires [type information](https://typescript-eslint.io/linting/typed-linting).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When an `if` branch starts by reading the same entry that its condition checks with `.has()`, use one `.get()` call and check the returned value. Comparing with `undefined` keeps the branch behavior for stored values such as `0`, `false`, and `null`.

This rule runs when TypeScript type information is available and `strictNullChecks` is enabled. It checks `Map`, `ReadonlyMap`, and `WeakMap` when their value types exclude `undefined`. A map can have an `undefined` key. A stored `undefined` value makes `.get()` ambiguous.

The rule checks a direct `.has()` condition followed by a single `const` binding at the start of the branch. It skips lookups with type expressions on the receiver or key. For `.get(key)!`, the value type must also exclude `null`. The rule offers an editor suggestion when it can move the declaration without a name conflict or comment loss. Use [`prefer-has-check`](./prefer-has-check.md) for checks that only need to know whether the entry exists.

## Examples

```ts
declare const map: Map<string, number>;
declare const key: string;

// ❌
if (map.has(key)) {
	const entry = map.get(key);
	console.log(entry);
}

// ✅
const entry = map.get(key);
if (entry !== undefined) {
	console.log(entry);
}
```
