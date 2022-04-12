# Prefer to add the old error as new error\'s `cause` property

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

Prefer to add the old error as new error\'s `cause` property when throwing a new error in `try/catch` or `Promise#catch`.

## Fail

```js
try {} catch {
	throw new Error('oops');
}
```

```js
promise.catch(() => {
	throw new Error('oops');
});
```

## Pass

```js
try {} catch (error) {
	throw new Error('oops', {cause: error});
}
```

```js
promise.catch(error => {
	throw new Error('oops', {cause: error});
});
```
