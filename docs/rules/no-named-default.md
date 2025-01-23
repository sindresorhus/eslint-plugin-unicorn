# Disallow default export as named

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

TBD

## Examples

```js
// ❌
import {default as foo} from "foo";

// ✅
import foo from "foo";
```

```js
const foo = "1";

// ❌
export {foo as default};

// ✅
export default foo;
```
