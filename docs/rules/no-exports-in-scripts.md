# no-exports-in-scripts

📝 Disallow exports in scripts.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Scripts are meant to be executed directly, not imported as modules.

## Examples

This script fails:

```js
#!/usr/bin/env node
export const foo = 1;
```

This script passes:

```js
#!/usr/bin/env node
const foo = 1;
console.log(foo);
```

```js
export const foo = 1;
```
