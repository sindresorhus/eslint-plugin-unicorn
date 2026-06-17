# no-incorrect-template-string-interpolation

📝 Disallow incorrect template literal interpolation syntax.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Template literal interpolation uses `${expression}`. This rule catches likely mistakes where simple identifier or member-expression interpolation was written as `{name}` or `$name}` inside an untagged template literal.

This rule is intentionally narrow. It does not report arbitrary expression text like `{name + suffix}` or other placeholder syntaxes like `{{name}}`, and it ignores tagged template literals because tags often use braces for other languages such as HTML, CSS, GraphQL, or i18n templates. It also ignores named `import`/`export` specifiers like `import {foo} from "bar"` and destructuring declarations like `const {foo} = bar`, which are common in code-generation templates.

Disable this rule for files that intentionally use simple brace placeholders like `/users/{id}` or contain other brace syntax such as object literals (`` `const x = {foo}` ``) in untagged template literals.

## Examples

```js
// ❌
const greeting = `Hello {name}`;

// ❌
const greeting = `Hello $user.name}`;

// ✅
const greeting = `Hello ${name}`;

// ✅
const greeting = `Hello ${user.name}`;

// ✅
const query = gql`query { user { name } }`;

// ✅
const code = `import {foo} from "bar";`;

// ✅
const code = `const {foo} = bar;`;
```
