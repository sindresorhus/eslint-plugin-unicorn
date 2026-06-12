# prefer-identifier-import-export-specifiers

📝 Prefer identifiers over string literals in import and export specifiers.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer identifier syntax over string-literal syntax in import and export specifiers when the string is a valid identifier name.

This rule does not require all specifiers to use the same style. Use string literals when the imported or exported name cannot be written as an identifier.

## Examples

```js
// ❌
import {'foo' as foo} from 'foo';

// ✅
import {foo as foo} from 'foo';
```

```js
// ❌
export {foo as 'bar'};

// ✅
export {foo as bar};
```

```js
// ❌
export {'foo' as bar} from 'foo';

// ✅
export {foo as bar} from 'foo';
```

```js
// ✅
import {'a string' as aString} from 'foo';
```
