# Disallow side effects at the top level of a module (`no-top-level-side-effects`)

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Importing a module should not have side effects. This rule disallows side effects at the top level of a module.

Files with a hashbang (`#!/usr/bin/env node`) and files with no exports are ignored, as they are considered scripts or entry points.

Variable declarations (including those with function calls or `new` on the right-hand side) are allowed, as they are considered side-effect-free for the sake of usability.

## Examples

```js
// ❌
console.log('hello');
export const foo = 1;
```

```js
// ❌
document.title = 'gone';
export const foo = 1;
```

```js
// ✅
export function init() {
	document.title = 'gone';
}
```

```js
// ✅
export const details = new Map();
```

```js
// ✅ (no exports — entry point)
document.title = 'gone';
```

## Options

### `allowedCalls`

Type: `string[]`\
Default: `[]`

Function names or paths that are allowed to be called at the top level.

```js
// eslint unicorn/no-top-level-side-effects: ["error", {"allowedCalls": ["require"]}]
require('./polyfill');
export const foo = 1;
```
