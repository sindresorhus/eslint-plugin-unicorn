# Prefer `Reflect.apply()` over `Function#apply()`

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- RULE_NOTICE_END -->

[`Reflect.apply()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply) is arguably less verbose and easier to understand. In addition, when you accept arbitrary methods, it's not safe to assume `.apply()` exists or is not overridden.

## Fail

```js
function foo() {}

foo.apply(null, [42]);
Function.prototype.apply.call(foo, null, [42]);
foo.apply(this, [42]);
Function.prototype.apply.call(foo, this, [42]);
foo.apply(null, arguments);
Function.prototype.apply.call(foo, null, arguments);
foo.apply(this, arguments);
Function.prototype.apply.call(foo, this, arguments);
```

## Pass

```js
function foo() {}

Reflect.apply(foo, null, [42]);
```
