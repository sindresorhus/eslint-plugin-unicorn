# Enforce consistent assertion styles with `node:assert`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce consistent assertion styles with `node:assert`.

## Examples

```js
import assert from 'node:assert';

// ❌
assert(true);

// ✅
assert.ok(true);
```

```js
import {strict as assert} from 'node:assert';

// ❌
assert(true);

// ✅
assert.ok(true);
```

```js
import assert from 'node:assert/strict';

// ❌
assert(true);

// ✅
assert.ok(true);
```
