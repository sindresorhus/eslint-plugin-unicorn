# consistent-assert

📝 Enforce consistent assertion style with `node:assert`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `assert.ok()` over `assert()` for its explicit intent and better readability. It aligns with other assert methods, ensuring consistency and making code easier to maintain and understand.

## Examples

```js
import assert from 'node:assert/strict';

assert.strictEqual(actual, expected);
assert.deepStrictEqual(actual, expected);

// ❌
assert(divide(10, 2) === 5);

// ✅
assert.ok(divide(10, 2) === 5);
```

```js
import assert from 'node:assert';

assert.strictEqual(actual, expected);
assert.deepStrictEqual(actual, expected);

// ❌
assert(divide(10, 2) === 5);

// ✅
assert.ok(divide(10, 2) === 5);
```

```js
import {strict as assert} from 'node:assert';

assert.strictEqual(actual, expected);
assert.deepStrictEqual(actual, expected);

// ❌
assert(divide(10, 2) === 5);

// ✅
assert.ok(divide(10, 2) === 5);
```
