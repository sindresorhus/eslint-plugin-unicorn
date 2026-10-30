# prefer-regexp-exec

📝 Prefer `RegExp#exec()` over `String#match()` for non-global regular expressions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer [`RegExp#exec()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec) when retrieving a single match and its capture groups.

This rule only reports when the receiver is known to be a string and the regular expression is statically known to be non-global. It recognizes literals, `const` aliases, and static `RegExp(...)` or `new RegExp(...)` calls with constant, side-effect-free arguments. Quoted method names and template literals without expressions are also checked. String types can also be inferred from JSDoc, TypeScript annotations, and TypeScript type information when available.

Global regular expressions and expressions with unknown flags are left unchanged because `String#match()` behaves differently with the `g` flag. Regular expression arguments with side effects, optional receivers, optional calls, and string patterns are not checked. Calls used directly for their truthiness are left to [`prefer-regexp-test`](prefer-regexp-test.md).

Mixed pattern types such as `RegExp | string` are left unchanged. Type inference may also skip wrapped types such as `Readonly<RegExp>`.

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
