# Require non-empty module attributes for imports and exports

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce non-empty attribute list in `import`/`export` statements and `import()` expressions.

## Examples

```js
// ❌
import foo from 'foo' with {};

// ✅
import foo from 'foo';
```

```js
// ❌
export {foo} from 'foo' with {};

// ✅
export {foo} from 'foo';
```

```js
// ❌
const foo = await import('foo', {});

// ✅
const foo = await import('foo');
```

```js
// ❌
const foo = await import('foo', {with: {}});

// ✅
const foo = await import('foo');
```
