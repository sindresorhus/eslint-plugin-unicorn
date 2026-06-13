# consistent-template-literal-escape

📝 Enforce consistent style for escaping `${` in template literals.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When you need to include a literal `${` in a template literal (without it being interpreted as the start of an interpolation), there are multiple ways to escape it. This rule enforces using `\${` (escaping the dollar sign) for consistency, as it's the most intuitive and clearest approach.

## Escaping methods

- `\${` — escape the dollar sign ✅ (recommended)
- `$\{` — escape the opening brace (works, but inconsistent)
- `\$\{` — escape both (redundant)

## Examples

```js
// ❌ - Escaping the brace is inconsistent
const template = `$\{variableName}`;

// ❌ - Escaping both is redundant
const template = `\$\{variableName}`;

// ✅ - Escape the dollar sign
const template = `\${variableName}`;
```

```js
// ✅ - Common use case: template strings for users
const message = `Use \${variable} in your code`;

// ✅ - JavaScript regex pattern
const regex = `/\${pattern}/g`;
```

```js
// ✅ - Normal variable interpolation still works
const name = 'Alice';
const greeting = `Hello ${name}, use \${variable} for templates`;
// → "Hello Alice, use ${variable} for templates"
```
