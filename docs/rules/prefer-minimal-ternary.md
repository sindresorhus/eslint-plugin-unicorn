# prefer-minimal-ternary

📝 Prefer moving ternaries into the minimal varying part of an expression.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule reports ternary expressions where both branches share the same outer expression shape and only one direct subexpression changes.

Moving the ternary into the varying part avoids duplicating the surrounding expression and makes the real difference easier to see.

## Examples

```js
// ❌
const foo = test ? call(a) : call(b);

// ✅
const foo = call(test ? a : b);
```

```js
// ❌
const foo = test ? a() : b();

// ✅
const foo = (test ? a : b)();
```

```js
// ❌
const foo = test ? a + 1 : b + 1;

// ✅
const foo = (test ? a : b) + 1;
```

```js
// ❌
await (
	delayRejection
		? Promise.allSettled([
			promise,
			delay(minimumDelay),
		])
		: Promise.all([
			promise,
			delay(minimumDelay),
		])
);

// ✅
await Promise[delayRejection ? 'allSettled' : 'all']([
	promise,
	delay(minimumDelay),
]);
```

This rule intentionally only reports shallow, obvious cases. It does not recursively minimize nested expressions.

The rule is not autofixable because moving the ternary can change evaluation order in some cases. Review each report before refactoring.
