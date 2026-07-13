# no-useless-template-literals

📝 Disallow useless template literal expressions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Template literal expressions are useful when they interpolate dynamic values into surrounding text. They are unnecessary when the expression is already a static value, or when the whole template literal only coerces a single expression to a string.

This rule does not require TypeScript type information. For reportable expression-only templates, it suggests `String(value)` instead of autofixing to the bare expression. This is a manual suggestion because it can differ for values like `Symbol()` or when `String` is shadowed.

Without TypeScript type information, dynamic expression-only templates in TypeScript are ignored because replacing them with `String()` can change the expression's type or make the surrounding code invalid. When type information is available, the rule reports only when the replacement is type-compatible. Dynamic expression-only templates with `as const` or `<const>` assertions are always ignored because `String()` cannot be used in a const assertion.

This rule does not replace ESLint's [`no-implicit-coercion`](https://eslint.org/docs/latest/rules/no-implicit-coercion). They can be enabled together: `no-implicit-coercion` checks shorthand coercions, while this rule checks useless template literal syntax. The only overlap is expression-only templates like `` `${value}` `` when `no-implicit-coercion` enables `disallowTemplateShorthand`.

Tagged templates are ignored because tags can observe raw template parts and expression boundaries.

## Examples

```js
// ❌
const message = `${'Hello'}`;

// ✅
const message = 'Hello';
```

```js
// ❌
const message = `Hello ${'world'}!`;

// ✅
const message = `Hello world!`;
```

```js
// ❌
const message = `${value}`;

// ✅
const message = String(value);
```

```js
// ✅
const message = tag`${'value'}`;
```
