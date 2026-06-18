# no-duplicate-if-branches

📝 Disallow duplicate adjacent branches in if chains.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->

When two adjacent branches in an `if`/`else if`/`else` chain have the same body, the condition that chooses between them is often redundant. This is usually a copy-paste bug or an incomplete refactor.

This rule compares exact token-equivalent branch bodies. It ignores comments, formatting, and optional trailing semicolons, but it does not try to prove semantic equivalence. For example, semantically equivalent code with different tokens is not reported. Empty branches are ignored.

Only adjacent branches are compared. Non-adjacent duplicate bodies can be legitimate fallback behavior.

## Examples

```js
// ❌
if (isAdmin) {
	showDashboard();
	loadStats();
} else {
	showDashboard();
	loadStats();
}

// ✅
if (isAdmin) {
	showDashboard();
	loadStats();
} else {
	showLogin();
}
```

```js
// ❌
if (value === 'a') {
	doThing();
} else if (value === 'b') {
	doThing();
}

// ✅
if (value === 'a' || value === 'b') {
	doThing();
}
```

This rule only checks `if` chains. It does not check `switch` cases or ternary expressions.
