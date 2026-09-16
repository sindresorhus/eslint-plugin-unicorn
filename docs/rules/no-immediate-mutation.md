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

## Options

Type: `object`

### checkConditionals

Type: `boolean`\
Default: `false`

By default, conditional mutations are allowed. Set `checkConditionals` to `true` to check them:

```js
{
	rules: {
		'unicorn/no-immediate-mutation': ['error', {checkConditionals: true}],
	},
}
```

With this option enabled, the rule also checks the mutations above when they immediately follow initialization in an `if` statement, `condition && mutation`, or `condition ? mutation : mutation`. Each branch must contain one mutation, optionally enclosed in a block. Both branches must use the same mutation type on the same variable, and `Object.assign()` is limited to one source.

```js
// ❌
const array = [1, 2];
if (enabled) {
	array.push(3, 4);
}

// ✅
const array = [1, 2, ...(enabled ? [3, 4] : [])];
```

Conditions and mutation inputs that reference the initialized variable are ignored. Nested conditionals, `else if`, multiple statements per branch, mixed mutations, `||`, and `??` are not supported.

Potential side effects in the condition or mutation inputs and `unshift()` on a nonempty array produce suggestions instead of automatic fixes. No fix or suggestion is offered when comments would move or disappear, or for statically named `__proto__` keys in property assignments or `Object.assign()` object-literal sources.

In TypeScript files or with the TypeScript parser, conditional mutations are reported without fixes or suggestions because the spread can lose contextual typing. Unconditional mutations retain their existing behavior.
