# prefer-simple-condition-first

📝 Prefer simple conditions first in logical expressions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When writing multiple conditions in a logical expression (`&&`, `||`), simple conditions should come first. This can improve readability and performance, since simple checks like identifiers and strict equality comparisons are cheaper to evaluate and can short-circuit before expensive operations.

A condition is considered "simple" if it is:

- A bare identifier (`foo`)
- A negated simple condition (`!foo`)
- A strict equality or inequality comparison between identifiers and/or literals, with at least one identifier (`foo === 1`, `a !== b`)

The rule checks each complete chain of the same logical operator and reports it once when a simple condition follows a complex condition. Conditions are reordered as a stable group, preserving the relative order among both the simple and complex conditions.

## Examples

### `&&`

```js
// ❌
if ((foo ? bar : baz) && ready && enabled);

// ✅
if (ready && enabled && (foo ? bar : baz));
```

```js
// ❌ Reported, but not automatically fixed
if (check(foo) && ready);

// ✅
if (ready && check(foo));
```

### `||`

```js
// ❌
if ((foo ? bar : baz) || ready || enabled);

// ✅
if (ready || enabled || (foo ? bar : baz));
```

The rule only checks logical expressions used as conditions. It does not report value-producing expressions such as `const value = foo() || fallback`, because reordering can change the resulting value.

## Fix safety

Reporting and fixing are intentionally separate. The rule reports misplaced simple conditions even when reordering might change evaluation behavior. Automatic fixes are limited to comment-free chains composed of simple conditions and conditional expressions that recursively contain only simple conditions.

When reordering could affect short-circuit behavior, the diagnostic explicitly asks you to verify the behavior and does not provide a fix.

For example, expressions containing the following are reported without an automatic fix:

- Function calls and `new` expressions
- Assignment and update expressions
- Property reads, including optional and computed property access
- Operations that can invoke implicit coercion
- `await` and `yield` expressions
- Comments that would need to be moved

This lets the rule identify the readability issue while leaving behavior-sensitive changes for manual review.
