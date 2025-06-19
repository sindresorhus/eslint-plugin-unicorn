# Disallow empty specifier list in import and export declaration

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow empty specifier list, use ["side effect import"](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#import_a_module_for_its_side_effects_only) if the module has side effects, otherwise the declaration should be removed.

## Examples

```js
// ❌
import {} from "foo";

// ✅
import "foo";
```

```js
// ❌
export {} from "foo";

// ✅
import "foo";
```

```js
// ❌
import foo, {} from "foo";

// ✅
import foo from "foo";
```

```js
// ❌
export {}
```
