# no-useless-template-literals

📝 Disallow useless template literal expressions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Template literal expressions are useful when they interpolate dynamic values into surrounding text. They are unnecessary when the expression is already a static value, or when the whole template literal only coerces a single expression to a string.

This rule intentionally does not use TypeScript type information. For expression-only templates with unknown value types, it reports the pattern and suggests `String(value)` instead of autofixing to the bare expression. This is a manual suggestion because it can differ for values like `Symbol()` or when `String` is shadowed.

Expression-only templates with dynamic expressions are ignored when wrapped in TypeScript `as const` or `<const>` assertions, since replacing them with `String()` would widen the result to `string` and make the surrounding const assertion invalid.

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
