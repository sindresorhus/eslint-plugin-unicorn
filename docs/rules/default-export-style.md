# default-export-style

📝 Enforce consistent default export declarations.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce whether default-exported functions and classes are declared inline with `export default` or separately. For functions, separate means a `const` arrow function exported by identifier. For classes, separate means a class declaration exported by identifier.

A consistent declaration style makes default exports easier to scan and avoids mixing multiple declaration forms across a codebase.

This rule only checks local default exports. Named exports are intentionally ignored. Use [`consistent-function-style`](./consistent-function-style.md) for named function export syntax.

Anonymous default exports remain the responsibility of [`no-anonymous-default-export`](./no-anonymous-default-export.md).

## Examples

```js
// eslint unicorn/default-export-style: ["error", {functions: "inline"}]

// ❌
const foo = () => {};
export default foo;

// ✅
export default function foo() {}
```

```js
// eslint unicorn/default-export-style: ["error", {functions: "separate"}]

// ❌
export default function foo() {}

// ✅
const foo = () => {};
export default foo;
```

```js
// eslint unicorn/default-export-style: ["error", {functions: "ignore"}]

// ✅
export default function foo() {}

// ✅
const foo = () => {};
export default foo;
```

```js
// eslint unicorn/default-export-style: ["error", {classes: "inline"}]

// ❌
class Foo {}
export default Foo;

// ✅
export default class Foo {}
```

```js
// eslint unicorn/default-export-style: ["error", {classes: "separate"}]

// ❌
export default class Foo {}

// ✅
class Foo {}
export default Foo;
```

```js
// eslint unicorn/default-export-style: ["error", {classes: "ignore"}]

// ✅
export default class Foo {}

// ✅
class Foo {}
export default Foo;
```

## Options

Type: `object`

Default:

```js
{
	functions: 'inline',
	classes: 'inline',
}
```

### `functions`

Allowed values: `'inline'`, `'separate'`, `'ignore'`

`'inline'` requires named default-exported functions to be declared inline:

```js
export default function foo() {}
```

`'separate'` requires named default-exported functions to use a separate `const` arrow function declaration:

```js
const foo = () => {};
export default foo;
```

`'ignore'` disables checks for functions.

> [!NOTE]
> `functions: 'separate'` may conflict with [`consistent-function-style`](./consistent-function-style.md) if `namedFunctions: 'declaration'` is enabled.

### `classes`

Allowed values: `'inline'`, `'separate'`, `'ignore'`

`'inline'` requires named default-exported classes to be declared inline:

```js
export default class Foo {}
```

`'separate'` requires named default-exported classes to use a separate class declaration:

```js
class Foo {}
export default Foo;
```

`'ignore'` disables checks for classes.

## Limitations

This rule intentionally ignores named exports, re-exports, CommonJS, anonymous defaults, non-adjacent declaration/export pairs, comments between declarations and exports, imported identifiers, values, objects, arrays, function expressions, `let`/`var` functions, multiple variable declarators, generators, later reassigned bindings, and TypeScript-specific syntax.
