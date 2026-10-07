# prefer-single-object-destructuring

📝 Prefer a single object destructuring declaration per local const source.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer one object destructuring declaration when consecutive declarations read from the same local `const` source.

When merging destructurings, this rule only reports adjacent declarations with the same declaration kind and the same identifier source. The source identifier must resolve to a local `const` binding, so mutable or unresolved sources are ignored. More complex patterns are ignored by design.

The rule also inlines a local `const` used only by the next `const` or `let` destructuring when its initializer is an identifier, property access, call, constructor call, tagged template, or `await` expression. Type annotations prevent inlining.

## Examples

```js
// ❌
const foo = {};
const {bar} = foo;
const {baz} = foo;

// ✅
const foo = {};
const {bar, baz} = foo;
```

```js
// ❌
const foo = getFoo();
const {bar, baz} = foo;

// ✅
const {bar, baz} = getFoo();
```

```js
// ✅
let foo = {};
const {bar} = foo;
const {baz} = foo;
```

```js
// ✅
import foo from 'foo';
const {bar} = foo;
const {baz} = foo;
```

```js
// ✅
const {bar} = foo;
console.log(bar);
const {baz} = foo;
```
