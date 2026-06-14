# no-optional-chaining-on-undeclared-variable

📝 Disallow optional chaining on undeclared variables.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Optional chaining only short-circuits when the checked value is `null` or `undefined`. It does not suppress a `ReferenceError` from reading an undeclared variable.

Declare the variable, configure it as a global, or access it through `globalThis` when the property may be absent.

## Examples

```js
// ❌
iDontExist?.meNeither;

// ✅
globalThis.iDontExist?.meNeither;
```

```js
// ❌
iDontExist?.();

// ✅
let iDontExist;
iDontExist?.();
```

```js
// ❌
iDontExist.meNeither?.();

// ✅
globalThis.iDontExist?.meNeither?.();
```
