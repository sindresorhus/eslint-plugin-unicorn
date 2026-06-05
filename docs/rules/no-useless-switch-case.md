# no-useless-switch-case

📝 Disallow useless case in switch statements.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

An empty case before the last default case is useless.

## Examples

```js
// ❌
switch (foo) {
	case 1:
	default:
		handleDefaultCase();
		break;
}
```

```js
// ✅
switch (foo) {
	case 1:
	case 2:
		handleCase1And2();
		break;
}
```

```js
// ✅
switch (foo) {
	case 1:
		handleCase1();
		break;
	default:
		handleDefaultCase();
		break;
}
```

```js
// ✅
switch (foo) {
	case 1:
		handleCase1();
		// Fallthrough
	default:
		handleDefaultCase();
		break;
}
```

```js
// ✅
switch (foo) {
	// This is actually useless, but we only check cases where the last case is the `default` case
	case 1:
	default:
		handleDefaultCase();
		break;
	case 2:
		handleCase2();
		break;
}
```
