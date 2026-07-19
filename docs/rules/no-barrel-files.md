# no-barrel-files

📝 Disallow barrel files.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A barrel file only imports and re-exports bindings from other modules. Barrel files make it less clear where a dependency comes from and can cause consumers to load more modules than they need.

This rule treats any file whose top-level body consists only of imports and re-exports as a barrel, including a file that re-exports from only one module. It is intentionally syntax-only: it does not resolve modules or try to distinguish package entry points from internal barrel files. Disable it in intentional entry points.

Side-effect-only imports are not part of a barrel file, so a file that combines one with re-exports is ignored.

## Examples

Examples of **incorrect** code for this rule:

```js
export {foo} from './foo.js';
```

```js
import {foo} from './foo.js';
export {foo};
```

```js
export * from './foo.js';
export * from './bar.js';
```

Examples of **correct** code for this rule:

```js
export const foo = 1;
```

```js
import {foo} from './foo.js';
export const bar = foo;
```

```js
export {foo} from './foo.js';
export const bar = 1;
```
