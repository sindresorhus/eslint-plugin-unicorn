# no-break-in-nested-loop

📝 Disallow `break` and `continue` in nested loops and switches inside loops.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Nested loops can be readable, but `break` and `continue` in nested control flow inside loops are easy to misread because the target is not always obvious. Move the inner loop or switch into a function instead.

Labeled `break` and `continue` statements are allowed because their target is explicit.

## Examples

```js
// ❌
for (const item of items) {
	for (const child of item.children) {
		if (child.done) {
			break;
		}
	}
}

// ✅
function processChildren(item) {
	for (const child of item.children) {
		if (child.done) {
			break;
		}
	}
}

for (const item of items) {
	processChildren(item);
}
```

```js
// ❌
for (const item of items) {
	switch (item.type) {
		case 'hidden':
			break;
		case 'visible':
			continue;
	}
}
```

```js
// ✅
for (const item of items) {
	for (const child of item.children) {
		check(child);
	}
}
```
