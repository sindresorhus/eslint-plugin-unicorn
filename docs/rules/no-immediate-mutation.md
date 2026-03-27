# no-immediate-mutation

📝 Disallow immediate mutation after variable assignment.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When you create a variable and immediately mutate it, you should instead include those changes in the initial value.

- Assign variable to an array literal and immediately mutate with `Array#{push,unshift}(…)`.
- Assign variable to an object literal and immediately assign another property.
- Assign variable to an object literal and immediately mutate with `Object.assign(…)`.
- Assign variable to a `Set` or `WeakSet` from an array literal and immediately adding a new element with `{Set,WeakSet}.add(…)`.
- Assign variable to a `Map` or `WeakMap` from an array literal and immediately set another key with `{Map,WeakMap}.set(…, …)`.

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
const object = {foo: 1, bar: 2};
```

```js
// ❌
const object = {foo: 1};
Object.assign(object, {bar: 2});

// ✅
const object = {foo: 1, bar: 2};
```

```js
// ❌
const object = {foo: 1};
Object.assign(object, bar);

// ✅
const object = {foo: 1, ...bar};
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
