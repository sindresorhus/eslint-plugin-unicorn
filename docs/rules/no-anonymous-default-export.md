# no-anonymous-default-export

📝 Disallow anonymous functions and classes as the default export.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Naming default exports improves codebase searchability by ensuring consistent identifier use for a module's default export, both where it's declared and where it's imported.

## Examples

```js
// ❌
export default class {}

// ✅
export default class Foo {}
```

```js
// ❌
export default function () {}

// ✅
export default function foo () {}
```

```js
// ❌
export default () => {};

// ✅
const foo = () => {};
export default foo;
```

```js
// ❌
module.exports = class {};

// ✅
module.exports = class Foo {};
```

```js
// ❌
module.exports = function () {};

// ✅
module.exports = function foo () {};
```

```js
// ❌
module.exports = () => {};

// ✅
const foo = () => {};
module.exports = foo;
```
