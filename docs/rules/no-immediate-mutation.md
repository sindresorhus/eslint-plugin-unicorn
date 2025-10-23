# Disallow immediate mutation after declaration

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Immediate mutation after declaration is not allowed when it can be done in the variable initialization step.

1. Declare an array literal and immediately mutation with `Array#{push,unshift}(…)`.
1. Declare an object literal and immediately assign another property.
1. Declare a `Set` or `WeakSet` and immediately adding an new element with `{Set,WeakSet}.add(…)`.
1. Declare a `Map` or `WeakMap` and immediately set another key with `{Map,WeakMap}.set(…, …)`.

## Examples

```js
// ❌
const array = [1, 2];
array.push(3, 4);

// ✅
const array = [1, 2, 3, 4];
```

```js

// ❌
const array = [3, 4];
array.unshift(1, 2);

// ✅
const array = [1, 2, 3, 4];
```

```js
// ❌
const object = {foo: 1};
object.bar = 2;

// ✅
const obj = {foo: 1, bar: 2};
```

```js
// ❌
const set = new Set([1, 2]);
set.add(3);

// ✅
const set = new Set([1, 2, 3]);
```

```js
// ❌
const weakSet = new WeakSet([foo, bar]);
weakSet.add(baz);

// ✅
const weakSet = new WeakSet([foo, bar, baz]);
```

```js
// ❌
const map = new Map([
	['foo', 1],
]);
map.set('bar', 2);

// ✅
const map = new Map([
	['foo', 1],
	['bar', 2],
]);
```

```js
// ❌
const weakMap = new WeakMap([
	[foo, 1],
]);
weakMap.set(bar, 2);

// ✅
const weakMap = new WeakMap([
	[foo, 1],
	[bar, 2],
]);
```