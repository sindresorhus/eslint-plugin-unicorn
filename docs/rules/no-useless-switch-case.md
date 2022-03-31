# Disallow useless case in switch statement

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

💡 *This rule provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

Empty case before the last default case is useless.
## Fail

```js
switch (foo) {
	case 1:
	default:
		handleDefaultCase();
		break;
}
```

## Pass

```js
switch (foo) {
	case 1:
	case 2:
		handleCase1And2();
		break;
}
```

```js
switch (foo) {
	// This is actually useless, but we only check cases where the last case is `default` case
	case 1:
	default:
		handleDefaultCase();
		break;
	case 2:
		handleCase2();
		break;
}
```
