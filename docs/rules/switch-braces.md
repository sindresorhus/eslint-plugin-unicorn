# Enforce consistent brace style for `switch` statements

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

## Options

This rule has a string option:

- `"always"` (default) requires braces for `switch` statements.
- `"never"` disallows braces for `switch` statements.

### always

#### Fail

```js
switch (value) {
		case 'unicorn':
			break;
}
```

#### Pass

```js
switch (value) {
		case 'unicorn': {
			break;
		}
}
```

### never

#### Fail

```js
switch (value) {
		case 'unicorn': {
			break;
		}
}
```

#### Pass

```js
switch (value) {
		case 'unicorn':
			break;
}
```
