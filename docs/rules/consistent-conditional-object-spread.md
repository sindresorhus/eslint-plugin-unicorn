# consistent-conditional-object-spread

📝 Enforce consistent conditional object spread style.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When conditionally spreading properties into an object literal, pick one style consistently.

By default, this rule prefers `&&` because it avoids an unnecessary empty object branch.

## Examples

```js
// ❌
const object = {...(condition ? {property} : {})};

// ✅
const object = {...(condition && {property})};
```

An `undefined` or `null` fallback branch spreads nothing, so it is treated the same as an empty object:

```js
// ❌
const object = {...(condition ? {property} : undefined)};

// ✅
const object = {...(condition && {property})};
```

With the default `'logical'` style, a boolean cast of the condition is also reported, because every falsy value spreads nothing:

```js
// ❌
const object = {...(!!condition && {property})};

// ❌
const object = {...(Boolean(condition) && {property})};

// ✅
const object = {...(condition && {property})};

// ❌
const object = {...(!!first && !!second && {property})};

// ✅
const object = {...(first && second && {property})};
```

> [!NOTE]
> In TypeScript, a condition of type `unknown` needs the boolean cast, because TypeScript does not allow spreading `unknown`. Use an `// eslint-disable-next-line` comment in that case.

With the `'ternary'` option:

```js
// eslint unicorn/consistent-conditional-object-spread: ["error", "ternary"]

// ❌
const object = {...(condition && {property})};

// ✅
const object = {...(condition ? {property} : {})};
```

## Options

Type: `string`\
Default: `'logical'`

Available options:

- `'logical'` - Prefer `...(condition && object)`, without a boolean cast of `condition`.
- `'ternary'` - Prefer `...(condition ? object : {})`.
