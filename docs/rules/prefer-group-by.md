# prefer-group-by

📝 Prefer `Object.groupBy()` or `Map.groupBy()` over reduce-based grouping.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Object.groupBy()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy) and [`Map.groupBy()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/groupBy) express grouping directly and are easier to read than manually grouping with `Array#reduce()`.

This rule checks common reduce-based grouping patterns and intentionally ignores uncommon variants instead of trying to interpret every possible reducer.

> [!NOTE]
> `Object.groupBy()` returns a null-prototype object. Autofixing a reduce that starts from `{}` changes the result's prototype, which only matters for code that depends on inherited object properties or the prototype itself.

## Examples

```js
// ❌
const grouped = items.reduce((groups, item) => {
	groups[item.type] ??= [];
	groups[item.type].push(item);
	return groups;
}, {});

// ✅
const grouped = Object.groupBy(items, item => item.type);
```

```js
// ❌
const grouped = items.reduce((groups, item) => {
	if (groups.has(item.category)) {
		groups.get(item.category).push(item);
	} else {
		groups.set(item.category, [item]);
	}

	return groups;
}, new Map());

// ✅
const grouped = Map.groupBy(items, item => item.category);
```
