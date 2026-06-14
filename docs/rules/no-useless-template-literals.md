# no-useless-template-literals

📝 Disallow useless template literal expressions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Template literal expressions are useful when they interpolate dynamic values into surrounding text. They are unnecessary when the expression is already a static value, or when the whole template literal only coerces a single expression to a string.

This rule intentionally does not use TypeScript type information. For expression-only templates with unknown value types, it reports the pattern and suggests `String(value)` instead of autofixing to the bare expression. This is a manual suggestion because it can differ for values like `Symbol()` or when `String` is shadowed.

Unlike ESLint's [`no-implicit-coercion`](https://eslint.org/docs/latest/rules/no-implicit-coercion), this rule is only about useless template literal syntax. It does not check other coercion forms like `'' + value`, `+value`, or `!!value`.

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
