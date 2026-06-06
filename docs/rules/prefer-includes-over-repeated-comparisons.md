# prefer-includes-over-repeated-comparisons

📝 Prefer `.includes()` over repeated equality comparisons.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Repeated equality comparisons against the same value are easier to scan as a membership check.

This rule only reports strict equality comparisons joined by `||`. It ignores optional chains, side-effectful compared values, and `NaN` values because an `Array#includes()` rewrite would not have the same behavior.

This rule does not autofix, because the best rewrite depends on the surrounding code. An inline array is often fine, but a shared constant or `Set#has()` can be better when the list grows or is reused. Plain member expressions are still reported, so consider accessors and proxies before rewriting manually.

## Examples

```js
// ❌
value === 'a' || value === 'b';

// ✅
['a', 'b'].includes(value);
```

```js
// ❌
args[0] === '-h' || args[0] === '--help';

// ✅
['-h', '--help'].includes(args[0]);
```

```js
// ✅
value === 'a';
```

```js
// ✅
value !== 'a' && value !== 'b';
```

## Options

Type: `object`

### `minimumComparisons`

Type: `integer`\
Minimum: `2`\
Default: `2`

The minimum number of equality comparisons before reporting.

```js
/* eslint unicorn/prefer-includes-over-repeated-comparisons: ["error", {"minimumComparisons": 3}] */

// ✅
value === 'a' || value === 'b';

// ❌
value === 'a' || value === 'b' || value === 'c';
```
