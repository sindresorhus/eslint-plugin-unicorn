# no-incorrect-template-string-interpolation

📝 Disallow incorrect template string interpolation syntax.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Template literal interpolation uses `${expression}`. This rule catches likely mistakes where simple identifier or member-expression interpolation was written as `{name}` or `$name}` inside an untagged template literal.

This rule is intentionally narrow. It does not report arbitrary expression text like `{name + suffix}`, and it ignores tagged template literals because tags often use braces for other languages such as HTML, CSS, GraphQL, or i18n templates.

Disable this rule for files that intentionally use simple brace placeholders like `/users/{id}` in untagged template literals.

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
```
