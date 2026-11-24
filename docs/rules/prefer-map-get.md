# prefer-map-get

📝 Prefer reusing the result of `Map#get()` when checking and reading an entry.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

💭 This rule requires [type information](https://typescript-eslint.io/linting/typed-linting).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use one `.get()` when a branch guarded by `map.has(key)` starts with `const entry = map.get(key)`. Both calls must use the same map variable and a matching simple key. Checking `entry !== undefined` preserves stored values such as `0`, `false`, and `null`.

With TypeScript type information and `strictNullChecks`, the rule checks `Map`, `ReadonlyMap`, and `WeakMap` whose value types exclude `undefined`. For `.get(key)!`, the value type must also exclude `null`. The rule assumes standard methods and skips type expressions on the `.get()` receiver or key.

Suggestions move the declaration into an enclosing block or module when scope and comments permit. For existence-only checks, see [`prefer-has-check`](./prefer-has-check.md).

## Examples

```ts
// ❌
function logEntry(map: Map<string, number>, key: string) {
	if (map.has(key)) {
		const entry = map.get(key);
		console.log(entry);
	}
}
```

```ts
// ✅
function logEntry(map: Map<string, number>, key: string) {
	const entry = map.get(key);
	if (entry !== undefined) {
		console.log(entry);
	}
}
```
