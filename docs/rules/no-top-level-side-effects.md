# no-top-level-side-effects

📝 Disallow top-level side effects in exported modules.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->

<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule prevents modules with exports from doing work as soon as they are imported.
It ignores files without exports and files that start with a [hashbang](https://en.wikipedia.org/wiki/Shebang_(Unix)) → `#!/usr/bin/env node`.

## Examples

```js
// ❌
init();

export const value = 1;

// ❌
import './register.js';

export const value = 1;

// ❌
if (enabled) {
	init();
}

export const value = 1;
```

```js
// ✅
init();

// ✅
#!/usr/bin/env node
init();

export const value = 1;

// ✅
export const value = init();

// ✅
const value = init();

export {value};
```
