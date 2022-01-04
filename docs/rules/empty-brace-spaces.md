# Enforce no spaces between braces

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- RULE_NOTICE_END -->

## Fail

```js
class Unicorn {
}
```

```js
try {
	foo();
} catch { }
```

## Pass

```js
class Unicorn {}
```

```js
try {
	foo();
} catch {}
```
