# prefer-simple-condition-first

📝 Prefer simple conditions first in logical expressions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When writing multiple conditions in a logical expression (`&&`, `||`), simple conditions should come first. This can improve readability and may avoid evaluating more expensive conditions.

A condition is considered "simple" if it is:

- A bare identifier (`foo`)
- A negated simple condition (`!foo`)
- A strict equality or inequality comparison between identifiers, `typeof identifier`, literals, signed number literals, and negative BigInt literals, with at least one identifier or `typeof identifier` (`foo === 1`, `a !== b`, `index === -1`, `typeof value === 'string'`)
- A loose equality or inequality comparison between an identifier and `null`, in either operand order (`foo == null`, `null != foo`)

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

// ✅ After verifying the short-circuit behavior
if (ready && check(foo));
```

### `||`

```js
// ❌
if ((foo ? bar : baz) || ready || enabled);

// ✅
if (ready || enabled || (foo ? bar : baz));
```

The rule only checks logical expressions used as conditions, including explicit `Boolean()` conversions. It does not report value-producing expressions such as `const value = foo() || fallback`, because reordering can change the resulting value.

## Fix safety

Reporting and fixing are intentionally separate. The rule reports misplaced simple conditions even when reordering might change evaluation behavior. An automatic fix is provided only when every complex condition that would cross a simple condition is a conditional expression recursively composed of identifiers, `typeof identifier`, literals, signed number literals, negative BigInt literals, or simple conditions.

When reordering could affect short-circuit behavior, the diagnostic explicitly asks you to verify the behavior and does not provide a fix.

For example, expressions containing the following are reported without an automatic fix:

- Function calls and `new` expressions
- Assignment and update expressions
- Property reads, including optional and computed property access
- Operations that can invoke implicit coercion
- `await` and `yield` expressions

Comments that would need to move also prevent the automatic fix, even when reordering the conditions is otherwise safe.

This lets the rule identify the readability issue while leaving behavior-sensitive changes for manual review.
