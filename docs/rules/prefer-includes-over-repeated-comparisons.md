# prefer-includes-over-repeated-comparisons

📝 Prefer `.includes()` over repeated equality comparisons.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Comparing the same expression against multiple values is easier to scan as a membership check.

This rule only reports strict equality comparisons joined by `||`. It ignores optional chains, side-effectful compared values, and `NaN` values because an `Array#includes()` rewrite would not have the same behavior.

This rule does not autofix because the best rewrite depends on context. Plain member expressions are still reported, so consider accessors and proxies before rewriting.

## Examples

```js
// ❌
value === 'a' || value === 'b' || value === 'c';

// ✅
['a', 'b', 'c'].includes(value);
```

```js
// ❌
args[0] === '-h' || args[0] === '--help' || args[0] === '--version';

// ✅
['-h', '--help', '--version'].includes(args[0]);
```

```js
// ✅
value === 'a' || value === 'b';
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
Default: `3`

The minimum number of equality comparisons before reporting.

```js
/* eslint unicorn/prefer-includes-over-repeated-comparisons: ["error", {"minimumComparisons": 4}] */

// ✅
value === 'a' || value === 'b' || value === 'c';

// ❌
value === 'a' || value === 'b' || value === 'c' || value === 'd';
```
