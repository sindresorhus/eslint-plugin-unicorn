# no-new-buffer

📝 Enforce the use of `Buffer.from()` and `Buffer.alloc()` instead of the deprecated `new Buffer()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces the use of [Buffer.from](https://nodejs.org/api/buffer.html#static-method-bufferfromarray) and [Buffer.alloc()](https://nodejs.org/api/buffer.html#static-method-bufferallocsize-fill-encoding) instead of [new Buffer()](https://nodejs.org/api/buffer.html#new-bufferarray), which has been deprecated since Node.js 4.

When the first argument's type is unknown, the rule offers suggestions because additional arguments do not distinguish a numeric size from data. A string encoding as the second argument is the exception, since both forms throw for a numeric input, so `new Buffer(data, 'base64')` is automatically fixed.

Numeric inputs with extra arguments are also offered as suggestions because removing those arguments can change errors or evaluation. Numeric inputs with only a size are automatically fixed.

## Examples

```js
// ❌
const buffer = new Buffer('7468697320697320612074c3a97374', 'hex');

// ✅
const buffer = Buffer.from('7468697320697320612074c3a97374', 'hex');
```

```js
// ❌
const buffer = new Buffer([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]);

// ✅
const buffer = Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72])
```

```js
// ❌
const buffer = new Buffer(10);

// ✅
const buffer = Buffer.alloc(10);
```
