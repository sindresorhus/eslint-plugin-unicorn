# prefer-logical-operator-over-ternary

📝 Prefer using a logical operator over a ternary.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow ternary operators when simpler logical operator alternatives exist.

For patterns such as `foo ? foo : bar`, the rule provides suggestions instead of automatic fixes because either [`Logical OR` (`||`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR) or the [nullish coalescing operator (`??`)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator) may be appropriate.

For explicit nullish-check ternaries, this rule only suggests `??` when the source code itself proves nullish intent. It does not report arbitrary `foo || bar` expressions. TypeScript users who want type-aware `||` checks should use [`@typescript-eslint/prefer-nullish-coalescing`](https://typescript-eslint.io/rules/prefer-nullish-coalescing/).

The rule also handles ternaries with exactly one constant boolean branch, including simple `const` aliases. With TypeScript type information, it also recognizes identifiers whose types are exactly `true` or `false`, including declared and imported identifiers.

- `condition ? true : expression` becomes `Boolean(condition) || expression`.
- `condition ? false : expression` becomes `!condition && expression`.
- `condition ? expression : false` becomes `Boolean(condition) && expression`.
- `condition ? expression : true` becomes `!condition || expression`.

`Boolean()` is omitted when the condition is known boolean. The other branch must be known boolean.

These cases are reported without a fix in TypeScript, in JavaScript parsed with TypeScript services, or when a fix would remove comments. TypeScript rewrites can change narrowing, inferred types, or overload selection, even when using `!!` instead of `Boolean()`. This check is skipped inside `with` statements. Ternaries with two constant boolean branches are also skipped; use ESLint's [`no-unneeded-ternary`](https://eslint.org/docs/latest/rules/no-unneeded-ternary) for two boolean literals.

The rule also handles ternaries with exactly one `null` or `undefined` branch when used inline in a truthiness check, such as an `if` condition, `!`, or `Boolean()`. The same fix restrictions apply. This check does not track variables or analyze later truthiness guards.

## Examples

```js
// ❌
if (condition ? value : undefined) {
	consume();
}

// ✅
if (condition && value) {
	consume();
}
```

```js
// ❌
value ? true : Boolean(fallback());

// ✅
Boolean(value) || Boolean(fallback());
```

```js
// ❌
value ? Boolean(fallback()) : false;

// ✅
Boolean(value) && Boolean(fallback());
```

In TypeScript, use `!!` when the other branch relies on truthiness narrowing. `Boolean()` does not preserve that narrowing.

```ts
declare const constraint: object | undefined;
declare function visit(value: object): boolean;

// ❌
constraint ? visit(constraint) : false;

// ✅
!!constraint && visit(constraint);
```

```js
// ❌
foo ? foo : bar;

// ✅
foo ?? bar;

// ✅
foo || bar;
```

```js
// ❌
foo.bar ? foo.bar : foo.baz

// ✅
foo.bar ?? foo.baz
```

```js
// ❌
foo?.bar ? foo.bar : baz

// ✅
foo?.bar ?? baz
```

```js
// ❌
!bar ? foo : bar;

// ✅
bar ?? foo;
```

```js
// ❌
foo == null ? bar : foo;

// ✅
foo ?? bar;
```

```js
// ❌
foo === null || foo === undefined ? bar : foo;

// ✅
foo ?? bar;
```

```js
// ❌
foo !== null && foo !== undefined ? foo : bar;

// ✅
foo ?? bar;
```

```js
// ❌
foo == null ? undefined : foo.bar;

// ✅
foo?.bar;
```

```js
// ✅
foo ? bar : baz;
```
