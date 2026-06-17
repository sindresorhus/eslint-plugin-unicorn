# no-double-comparison

📝 Disallow two comparisons of the same operands that can be combined into one.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When a `||` or `&&` joins two comparisons of the same pair of operands, the pair often says the same thing as a single comparison. `x === y || x < y` is exactly `x <= y`. Combining them removes noise and avoids evaluating the operands twice.

The operands may appear in either order. `x === y || y < x` is also `x >= y`; the suggestion keeps the operand order of the first comparison.

## Examples

```js
// ❌
x === y || x < y;

// ✅
x <= y;
```

```js
// ❌
x === y || x > y;

// ✅
x >= y;
```

```js
// ❌
x <= y && x >= y;

// ✅
x === y;
```

```js
// ❌
x <= y && x !== y;

// ✅
x < y;
```

```js
// ❌ — operands in the other order
x === y || y < x;

// ✅
x >= y;
```

## Reductions

| Code | Combined |
| --- | --- |
| `x === y \|\| x < y` | `x <= y` |
| `x === y \|\| x > y` | `x >= y` |
| `x < y \|\| x > y` | `x !== y` |
| `x <= y && x >= y` | `x === y` |
| `x <= y && x !== y` | `x < y` |
| `x >= y && x !== y` | `x > y` |

## Caveats

The replacements are offered as [suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions), not autofixes, because some reductions can change runtime behavior for valid JavaScript values. For example, `undefined === undefined || undefined < undefined` is `true`, but `undefined <= undefined` is `false`.

The reductions assume the operands are the same primitive type, which is the common case. They are not exact for mixed types or objects with a custom `valueOf`, because the relational operators (`<`, `<=`, `>`, `>=`) coerce their operands while `===` and `!==` do not. For example, with `x = '5'`, `x === 5 || x < 5` is `false` but `x <= 5` is `true`. Such comparisons are unusual and typically a mistake, so the rule still reports them, but only as suggestions. Only strict equality (`===`/`!==`) is recognized; loose equality (`==`/`!=`) is left alone.

The rule does not flag a comparison that is fully implied by the other (`x <= y || x < y`) or a flipped pair without an equality check (`x < y || y > x`), since these are easy to write intentionally. It also only combines two comparisons at a time, so a longer chain is simplified pairwise rather than collapsed (`x < y || x === y || x > y` becomes `x <= y || x > y`).
