# Prefer omitting the `catch` binding parameter

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- RULE_NOTICE_END -->

If the `catch` binding parameter is not used, it should be omitted.

## Fail

```js
try {} catch (notUsedError) {}
```

```js
try {} catch ({message}) {}
```

## Pass

```js
try {} catch {}
```

```js
try {} catch (error) {
	console.error(error);
}
```
