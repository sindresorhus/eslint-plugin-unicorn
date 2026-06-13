# no-useless-recursion

📝 Disallow simple recursive function calls that can be replaced with a loop.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Recursive functions can throw a stack overflow error when they run too deeply. Simple tail-recursive functions are usually clearer as loops in JavaScript.

This rule intentionally only reports direct returned self-calls in named functions. More complex recursion can be useful and is left alone.

## Examples

```js
// ❌
function foo(bar) {
	if (bar.baz) {
		return foo(bar.baz);
	}

	return bar;
}
```

```js
// ✅
function foo(bar) {
	while (bar.baz) {
		bar = bar.baz;
	}

	return bar;
}
```

```js
// ✅
function foo(bar) {
	if (Array.isArray(bar)) {
		return bar.map(baz => foo(baz));
	}

	return bar;
}
```
