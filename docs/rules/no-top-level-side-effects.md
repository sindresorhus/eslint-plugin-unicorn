# Disallow side effects at module top level

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Modules with top-level side effects cannot be safely [tree-shaken](https://webpack.js.org/guides/tree-shaking/). Webpack calls these "pure modules" — a module is considered side-effect-free when it does not execute observable operations (function calls, `new` expressions) at the top level.

This rule is skipped for:

- Files with a hashbang (`#!/usr/bin/env node`) — these are scripts, not modules
- Files with no exports — files without exports are treated as scripts

Assignments at the top level are allowed since they are commonly used for CJS compatibility (`module.exports = …`).

## Examples

```js
// ❌
import {setup} from './setup.js';

setup();

export function foo() {}
```

```js
// ❌
export const bar = 1;

new EventEmitter();
```

```js
// ✅
export function foo() {}

export const bar = 1;
```

```js
// ✅ — assignments are allowed
module.exports = require('./lib.js');

export {};
```

```js
// ✅ — scripts (no exports) are not checked
console.log('Hello, world!');
```

```js
// ✅ — hashbang files are not checked
#!/usr/bin/env node
main();
```
