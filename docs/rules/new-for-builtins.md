# Enforce the use of `new` for all builtins, except `String`, `Number` and `Boolean`

They work the same, but `new` should be preferred for consistency with other constructors.

Enforces the use of `new` for following builtins:

- `Object`
- `Array`
- `ArrayBuffer`
- `BigInt64Array`
- `BigUint64Array`
- `DataView`
- `Date`
- `Error`
- `Float32Array`
- `Float64Array`
- `Function`
- `Int8Array`
- `Int16Array`
- `Int32Array`
- `Map`
- `WeakMap`
- `Set`
- `WeakSet`
- `Promise`
- `RegExp`
- `Uint8Array`
- `Uint16Array`
- `Uint32Array`
- `Uint8ClampedArray`
- `SharedArrayBuffer`

Disallows the use of `new` for following builtins.

- `String`
- `Number`
- `Boolean`
- `Symbol`
- `BigInt`

> These should not use `new` as that would create object wrappers for the primitive values, which is not what you want. However, without `new` they can be useful for coercing a value to that type.

This rule is fixable, except `new String()`, `new Number()`, and `new Boolean()`, [they return wrapped object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String#String_primitives_and_String_objects).

## Fail

```js
const list = Array(10);
```

```js
const now = Date();
```

```js
const map = Map([
	['foo', 'bar']
]);
```

## Pass

```js
const list = new Array(10);
```

```js
const now = new Date();
```

```js
const map = new Map([
	['foo', 'bar']
]);
```
