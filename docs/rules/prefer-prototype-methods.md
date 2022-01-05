# Prefer borrowing methods from the prototype instead of the instance

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

When “borrowing” a method from `Array` or `Object`, it‘s clearer to get it from the prototype than from an instance.

## Fail

```js
const array = [].slice.apply(bar);
```

```js
const hasProperty = {}.hasOwnProperty.call(foo, 'property');
```

```js
Reflect.apply([].forEach, arrayLike, [callback]);
```

## Pass

```js
const array = Array.prototype.slice.apply(bar);
```

```js
const hasProperty = Object.prototype.hasOwnProperty.call(foo, 'property');
```

```js
Reflect.apply(Array.prototype.forEach, arrayLike, [callback]);
```

```js
const maxValue = Math.max.apply(Math, numbers);
```
