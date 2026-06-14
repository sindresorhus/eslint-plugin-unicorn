# no-non-function-verb-prefix

📝 Disallow non-function values with function-style verb prefixes.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💭 This rule requires [type information](https://typescript-eslint.io/linting/typed-linting).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Names that start with function-style verbs like `get`, `set`, or `create` imply that the value is callable or constructable. This rule reports TypeScript bindings where the name starts with a configured verb but the non-nullish type is not always callable or constructable.

This rule only runs in TypeScript files and requires [type-aware linting](https://typescript-eslint.io/getting-started/typed-linting/). Without type information, it does nothing.

## Examples

```js
// ❌
const getName = 'Sindre';

// ✅
const getName = () => 'Sindre';
```

```js
// ❌
const createPizza = new Pizza();

// ✅
const createPizza = () => new Pizza();
```

```js
// ✅
const getter = 'name';
const get_name = 'name';
const GET_NAME = 'name';
```

## Options

Type: `object`

### verbs

Type: `Array<string>`\
Default: `['get', 'set', 'unset', 'delete', 'add', 'remove', 'destroy', 'create']`

Function-style verb prefixes to check. Only camel-case names where the verb is followed by an uppercase letter are checked.

```js
/* eslint unicorn/no-non-function-verb-prefix: ["error", {"verbs": ["build"]}] */

// ❌
const buildName = 'name';

// ✅
const buildName = () => 'name';
```
