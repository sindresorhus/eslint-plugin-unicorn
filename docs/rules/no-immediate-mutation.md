# no-immediate-mutation

📝 Disallow immediate mutation after variable assignment.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When you create a variable and immediately mutate it, you should instead include those changes in the initial value.

- Assign a variable to an array literal and immediately mutate it with `Array#{push,unshift}(…)`.
- Assign a variable to an object literal and immediately assign another property.
- Assign a variable to an object literal and immediately mutate it with `Object.assign(…)`.
- Assign a variable to a `Set` or `WeakSet` created without an iterable or from an array literal, and immediately add a new element with `{Set,WeakSet}.add(…)`.
- Assign a variable to a `Map` or `WeakMap` created without an iterable or from an array literal, and immediately set a new key with `{Map,WeakMap}.set(…, …)`.

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

## Conditional mutations

The rule also checks immediate mutations in `if`/`else` statements, standalone logical AND expressions (`condition && mutation`), and standalone conditional expressions (`condition ? mutation : mutation`). Each branch must contain exactly one supported mutation of the same variable, optionally enclosed in a block. Both branches must use the same mutation category, including the same array method (`push` or `unshift`). Conditional `Object.assign()` calls must have exactly one source.

```js
// ❌
const array = [1, 2];
if (enabled) {
	array.push(3, 4);
}

// ✅
const array = [1, 2, ...(enabled ? [3, 4] : [])];
```

```js
// ❌
const object = {foo: 1};
if (enabled) {
	object.bar = 2;
} else {
	object.baz = 3;
}

// ✅
const object = {foo: 1, ...(enabled ? {bar: 2} : {baz: 3})};
```

```js
// ❌
const set = new Set();
enabled && set.add(value);

// ✅
const set = new Set([...(enabled ? [value] : [])]);
```

```js
// ❌
const map = new Map();
enabled ? map.set(key, first) : map.set(key, second);

// ✅
const map = new Map([...(enabled ? [[key, first]] : [[key, second]])]);
```

Conditions and mutation inputs that reference the initialized variable are ignored. Nested conditionals, `else if` chains, branches with additional statements or mixed mutation categories, and logical OR (`||`) or nullish coalescing (`??`) expressions are not supported.

When the condition or mutation inputs may have side effects, the rule offers a suggestion instead of an automatic fix. Conditional `unshift()` also uses a suggestion when the existing array initializer may have side effects, because the transformation moves the condition and prepended elements before it. Fixes and suggestions are withheld when removing the conditional would remove or relocate comments, or when a branch assigns to a statically named `__proto__` property because an object spread cannot preserve the prototype mutation.

In TypeScript files or when using the TypeScript parser, conditional mutations are reported without fixes or suggestions. Conditional spreads can lose contextual typing for `Map` entries, literal unions, and callback parameters, so these transformations may require manual type adjustments. Unconditional mutations retain their existing fixes and suggestions.
