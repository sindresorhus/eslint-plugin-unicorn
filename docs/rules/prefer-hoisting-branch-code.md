# prefer-hoisting-branch-code

📝 Prefer moving code shared by all branches of an `if` statement out of the branches.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

When every branch of an `if`/`else if`/`else` chain begins or ends with the same code, that code does not depend on the condition and only adds duplication. Moving it out of the branches keeps each branch focused on what is actually different.

This rule compares branch statements by token, so it ignores comments, formatting, and optional trailing semicolons. It only reports a complete chain (one with a final `else`), and only when every branch keeps at least one distinct statement, so it never empties a branch. Fully identical branches are left to [`unicorn/no-duplicate-if-branches`](./no-duplicate-if-branches.md).

Shared trailing code is auto-fixed, since it already runs after each branch's own code. Shared leading code is only offered as a suggestion when it has side effects, because moving it before the `if` runs it before the conditions are evaluated, which can change behavior:

```js
// Moving the shared `counter += 1` before the `if` would change which branch runs.
if (counter === 0) {
	counter += 1;
	first();
} else {
	counter += 1;
	second();
}
```

The fix is skipped when it would change scope (the shared code declares a `let`/`const`/`class`, or trailing code references a variable declared earlier in the branch) or drop a comment.

## Examples

```js
// ❌
if (isAdmin) {
	log('access');
	showDashboard();
} else {
	log('access');
	showLogin();
}

// ✅
log('access');
if (isAdmin) {
	showDashboard();
} else {
	showLogin();
}
```

```js
// ❌
if (isAdmin) {
	showDashboard();
	cleanup();
} else {
	showLogin();
	cleanup();
}

// ✅
if (isAdmin) {
	showDashboard();
} else {
	showLogin();
}

cleanup();
```

## Related rules

- [`unicorn/no-duplicate-if-branches`](./no-duplicate-if-branches.md) reports whole branches that are identical. This rule reports code shared only at the start or end of branches that otherwise differ.
