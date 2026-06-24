# no-useless-concat

📝 Disallow useless concatenation of literals.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Concatenating two literals with `+` is pointless, they can be written as a single literal. This usually happens as a leftover from refactoring, for example after a variable is removed from the concatenation.

This is a fixable counterpart to the frozen [`no-useless-concat`](https://eslint.org/docs/latest/rules/no-useless-concat) ESLint core rule, and additionally catches adjacent literals inside longer concatenations.

## Examples

```js
// ❌
const message = 'Hello, ' + 'world!';

// ✅
const message = 'Hello, world!';
```

```js
// ❌
const path = directory + '/' + 'file.js';

// ✅
const path = directory + '/file.js';
```

```js
// ❌
const greeting = `Hello, ${name}` + `! Welcome.`;

// ✅
const greeting = `Hello, ${name}! Welcome.`;
```

Concatenation that would merge into a single string containing a `${…}` placeholder is left alone, since combining it would create an ambiguous template-like string that [`no-template-curly-in-string`](https://eslint.org/docs/latest/rules/no-template-curly-in-string) flags. The split is usually intentional.

```js
// ✅
const pluginsVariable = '$' + '{PLUGINS}';
```
