# no-useless-re-export

📝 Disallow redundant re-exports.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports named exports that are already covered by an `export *` from the same module.

Removing redundant re-exports keeps module API declarations smaller and avoids implying a special export when the wildcard already exposes it.

The rule only compares module specifiers as written. It does not resolve paths or inspect the module graph. Named exports are ignored when the file re-exports multiple distinct wildcard module requests, as those exports can resolve conflicting names.

Importing a binding and exporting it locally is the concern of [`prefer-export-from`](./prefer-export-from.md). This rule checks only direct `export … from` declarations.

## Examples

```js
// ❌
export * from './foo.js';
export {foo} from './foo.js';

// ✅
export * from './foo.js';
```

```js
// ✅
export * from './foo.js';
export {foo as bar} from './foo.js';
export {default} from './foo.js';
```

## Related rules

The following patterns are intentionally not reported because another rule handles them:

[`no-useless-rename`](https://eslint.org/docs/latest/rules/no-useless-rename):

```js
export {foo as foo} from './foo.js';
```

[`prefer-export-from`](./prefer-export-from.md):

```js
import {foo} from './foo.js';
export {foo};
```

[`no-duplicate-imports`](https://eslint.org/docs/latest/rules/no-duplicate-imports) with `includeExports: true`:

```js
export * from './foo.js';
export * from './foo.js';
```
