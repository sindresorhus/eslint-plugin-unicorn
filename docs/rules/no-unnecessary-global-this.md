# no-unnecessary-global-this

📝 Disallow unnecessary `globalThis` references.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports static `globalThis` property accesses when the property is already a known global and can be referenced directly.

It intentionally ignores unknown properties, writes, optional chains, direct `eval` calls, and locally shadowed globals. Direct calls and tagged-template calls are reported but not automatically fixed because removing the `globalThis` receiver can change `this`.

## Examples

```js
// ❌
globalThis.Array.from(items);

// ✅
Array.from(items);
```

```js
// ❌
globalThis.JSON.stringify(value);

// ✅
JSON.stringify(value);
```

```js
// ✅
globalThis.alert?.();
```

```js
// ✅
globalThis.jQuery = jQuery;
```
