# consistent-export-decorator-position

📝 Enforce consistent decorator position on exported classes.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Decorators can be placed before or after `export` and `export default` on class declarations. Pick one style for consistency.

This rule requires a parser that supports decorators, such as `@typescript-eslint/parser`.

## Examples

```js
// eslint unicorn/consistent-export-decorator-position: error

// ❌
export default @decorator class Foo {}

// ❌
@decorator export default class Foo {}

// ✅
@decorator
export default class Foo {}
```

### `before`

```js
// eslint unicorn/consistent-export-decorator-position: ["error", "before"]

// ❌
@decorator
export default class Foo {}

// ✅
@decorator export default class Foo {}
```

### `after`

```js
// eslint unicorn/consistent-export-decorator-position: ["error", "after"]

// ❌
@decorator
export default class Foo {}

// ✅
export default @decorator class Foo {}
```

## Options

Type: `string`\
Default: `'above'`

Available options:

- `'above'` - Require decorators on the line above the export.
- `'before'` - Require decorators before `export` on the same line.
- `'after'` - Require decorators after `export` or `export default`.
