# Enforce the use of `Buffer.from()` and `Buffer.alloc()` instead of the deprecated `new Buffer()`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces the use of [Buffer.from](https://nodejs.org/api/buffer.html#static-method-bufferfromarray) and [Buffer.alloc()](https://nodejs.org/api/buffer.html#static-method-bufferallocsize-fill-encoding) instead of [new Buffer()](https://nodejs.org/api/buffer.html#new-bufferarray), which has been deprecated since Node.js 4.

## Fail

```js
const buffer = new Buffer('7468697320697320612074c3a97374', 'hex');
```

```js
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
