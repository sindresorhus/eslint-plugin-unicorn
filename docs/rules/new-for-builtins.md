# Enforce the use of `new` for all builtins

They work the same, but `new` should be preferred for consistency with other constructors.

Enforces the use of `new` for following builtins.

- `Array`
- `ArrayBuffer`
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
- `Symbol`
- `Uint8Array`
- `Uint16Array`
- `Uint32Array`
- `Uint8ClampedArray`

Disallows the use of `new` for following builtins.

- `String`
- `Number`
- `Boolean`
- `Object`


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
