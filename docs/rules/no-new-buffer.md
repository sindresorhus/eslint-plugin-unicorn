# Enforce the use of `Buffer.from()` and `Buffer.alloc()` instead of the deprecated `new Buffer()`

Enforces the use of [Buffer.from](https://nodejs.org/api/buffer.html#buffer_class_method_buffer_from_array) and [Buffer.alloc()](https://nodejs.org/api/buffer.html#buffer_class_method_buffer_alloc_size_fill_encoding) instead of [new Buffer()](https://nodejs.org/api/buffer.html#buffer_new_buffer_array), which has been deprecated since Node.js 4.


## Fail

```js
const buf = new Buffer('7468697320697320612074c3a97374', 'hex');
const buf = new Buffer([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);
```

```js
const buf = new Buffer(10);
```


## Pass

```js
const buf = Buffer.from('7468697320697320612074c3a97374', 'hex');
const buf = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72])
```

```js
const buf = Buffer.alloc(10);
```
