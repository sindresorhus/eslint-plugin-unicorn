# Prefer specifying an old error as `cause` option where rethrowing the error

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

Prefer specifying old error as `cause` option where rethrowing the error.

This rule also supports custom error classes in addition to built-in one.

In case of custom errors, this rule assumes the last argument of the constructor is object able to receive `cause` property.

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
try {} catch (error) {
	throw new CustomError('oops', 'other argument', {cause: error});
}
```

```js
promise.catch(error => {
	throw new Error('oops', {cause: error});
});
```
