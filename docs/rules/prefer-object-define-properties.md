# Prefer using `Object.defineProperties` over multiple `Object.defineProperty` calls

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

When defining more than one properties, [Object.defineProperties](https://mdn.io/Object.defineProperties) should be preferred.

## Fail

```js
Object.defineProperty({}, "load", {
	value: () => {},
	writable: true,
});
Object.defineProperty({}, "build", {
	value: null,
	writable: true,
});
```

## Pass

```js
Object.defineProperties(
	{},
	{
		load: {
			value: () => {},
			writable: true,
		},
		build: {
			value: null,
			writable: true,
		},
	}
);
```
