# Disallow anonymous functions and classes as the default export

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Ensuring that default exports are named helps improve the grepability of the codebase by encouraging the re-use of the same identifier for the module's default export at its declaration site and at its import sites.

## Fail

```js
export default class {}
```

```js
export default function () {}
```

```js
export default () => {};
```

```js
module.exports = class {};
```

```js
module.exports = function () {};
```

```js
module.exports = () => {};
```

## Pass

```js
export default class Foo {}
```

```js
export default function foo () {}
```

```js
const foo = () => {};
export default foo;
```

```js
module.exports = class Foo {};
```

```js
module.exports = function foo () {};
```

```js
const foo = () => {};
module.exports = foo;
```
