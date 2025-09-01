# Require non-empty attribute list in import and export statements

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce non-empty attribute list in `import` and `export` statements.

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
