# Enforce the use of `Buffer.from()` and `Buffer.alloc()` instead of the deprecated `new Buffer()`

Enforces the use of [Buffer.from](https://nodejs.org/api/buffer.html#buffer_class_method_buffer_from_array) and [Buffer.alloc()](https://nodejs.org/api/buffer.html#buffer_class_method_buffer_alloc_size_fill_encoding) instead of [new Buffer()](https://nodejs.org/api/buffer.html#buffer_new_buffer_array), which has been deprecated since Node.js 4.

This rule is partly fixable.

## Fail

```js
const buffer = new Buffer('7468697320697320612074c3a97374', 'hex');
```

```
const buffer = new Buffer([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);
```

```js
const buffer = new Buffer(10);
```

## Pass

```js
const buffer = Buffer.from('7468697320697320612074c3a97374', 'hex');
```

```js
const buffer = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72])
```

```js
const buffer = Buffer.alloc(10);
```
