# no-unsafe-buffer-conversion

📝 Prevent unsafe conversions between `Buffer` and typed arrays.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

The `.buffer` property of a `Buffer` or typed array exposes the whole backing `ArrayBuffer`, not necessarily just the bytes visible through that view. Preserve `byteOffset` and `byteLength` when converting through `.buffer`.

## Examples

```js
// ❌
new Uint8Array(buffer.buffer);

// ✅
new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
```

```js
// ❌
new Uint32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

// ✅
new Uint32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Uint32Array.BYTES_PER_ELEMENT);
```

```js
// ❌
Buffer.from(bytes.buffer);

// ✅
Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
```

```js
// ❌
bytes.buffer.slice();

// ✅
bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
```
