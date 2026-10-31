# prefer-regexp-exec

📝 Prefer `RegExp#exec()` over `String#match()` for non-global regular expressions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer [`RegExp#exec()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) when retrieving a single match and its capture groups.

Checks known string receivers and statically non-global regexps, including literals, `const` aliases, and static `RegExp` constructors. Optional chains, string patterns, and regexp arguments with side effects are skipped. JSDoc and TypeScript string types are trusted.

For boolean checks, use [`prefer-regexp-test`](prefer-regexp-test.md).

## Examples

```js
const text = 'unicorn';

// ❌
const match = text.match(/uni(corn)/);

// ✅
const match = /uni(corn)/.exec(text);
```

```js
const text = 'unicorn';
const pattern = new RegExp('uni(corn)', 'i');

// ❌
const match = text.match(pattern);

// ✅
const match = pattern.exec(text);
```

The following cases are allowed:

```js
const matches = 'unicorn unicorn'.match(/unicorn/g);

function findMatch(text, pattern) {
	return text.match(pattern);
}
```
