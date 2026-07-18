# id-match

📝 Require identifiers to match a specified regular expression.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule is the same as the built-in ESLint [`id-match`](https://eslint.org/docs/latest/rules/id-match) rule, but with an additional `checkNamedSpecifiers` option.

Enforcing an identifier pattern prevents names from drifting from a project's naming convention while keeping that convention configurable.

## Replacement for ESLint `id-match`

This rule replaces ESLint's built-in `id-match` rule, which Unicorn presets disable when this rule is enabled.

## Examples

```js
/* eslint unicorn/id-match: ["error", "^[a-z]+$"] */

// ❌
const foo$ = 1;

// ✅
const foo = 1;
```

## Options

This rule supports the same options as ESLint `id-match`.

### `properties`

Set `properties` to `true` to check object and member property names.

### `classFields`

Set `classFields` to `true` to check class field names.

### `onlyDeclarations`

Set `onlyDeclarations` to `true` to only check declared identifiers.

### `ignoreDestructuring`

Set `ignoreDestructuring` to `true` to ignore identifiers in destructuring patterns.

### `checkNamedSpecifiers`

Set `checkNamedSpecifiers` to `false` to ignore named import specifiers and external named export specifiers:

```js
/* eslint unicorn/id-match: ["error", "^[a-z]+$", {"checkNamedSpecifiers": false}] */

// ✅
import {foo$} from 'module';

// ✅
export {foo$} from 'module';
```

Only named import specifiers and external named export specifiers are ignored. Default imports, namespace imports, namespace re-exports, local export specifiers, and later references to imported bindings are still checked:

```js
/* eslint unicorn/id-match: ["error", "^[a-z]+$", {"checkNamedSpecifiers": false}] */

// ❌
import foo$ from 'module';

// ❌
import * as foo$ from 'module';

// ❌
export * as foo$ from 'module';

// ❌
const foo = 1;
export {foo as bar$};

// ✅
import {bar$} from 'module';

// ❌
const foo = bar$;
```
