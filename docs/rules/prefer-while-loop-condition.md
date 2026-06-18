# prefer-while-loop-condition

📝 Prefer putting the condition in the while statement.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When a constant infinite loop immediately checks a condition and breaks, the loop condition is split across two places. Put the condition in the `while` statement so the loop's continuation condition is visible where readers expect it.

The rule only reports simple top-of-loop guards in `while (true)`, `for (;;)`, `for (; true;)`, and `do ... while (true)` loops. Loops with labels, additional `break` statements targeting the same loop, or comments inside the removable guard are ignored.

## Examples

```js
// ❌
while (true) {
	if (!hasMore()) {
		break;
	}

	processNext();
}
```

```js
// ✅
while (hasMore()) {
	processNext();
}
```

```js
// ❌
do {
	if (!hasMore()) {
		break;
	}

	processNext();
} while (true);
```

```js
// ✅
while (hasMore()) {
	processNext();
}
```

```js
// ❌
while (true) {
	if (done) {
		break;
	}

	processNext();
}
```

```js
// ✅
while (!done) {
	processNext();
}
```

```js
// ❌
for (;;) {
	if (!hasMore()) {
		break;
	}

	processNext();
}
```

```js
// ✅
while (hasMore()) {
	processNext();
}
```
