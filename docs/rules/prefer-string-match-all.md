# prefer-string-match-all

📝 Prefer `String#matchAll()` over `RegExp#exec()` loops.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `String#matchAll()` over `RegExp#exec()` loops when collecting every match from a string.

## Examples

```js
// ❌
const regexp = /foo/g;
const string = 'foofoo';
let match;
while ((match = regexp.exec(string)) !== null) {
	console.log(match);
}

// ✅
const regexp = /foo/g;
const string = 'foofoo';
for (const match of string.matchAll(regexp)) {
	console.log(match);
}
```
