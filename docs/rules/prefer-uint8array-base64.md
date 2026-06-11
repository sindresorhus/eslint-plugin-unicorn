# prefer-uint8array-base64

📝 Prefer `Uint8Array#toBase64()` and `Uint8Array.fromBase64()` over `atob()`, `btoa()`, and `Buffer` base64 conversions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`atob()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/atob) and [`btoa()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/btoa) operate on “binary strings”, so they cannot round-trip Unicode text without [workarounds](https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem). Node's `Buffer` base64 conversions work, but tie you to `Buffer`.

The [`Uint8Array` base64 methods](https://github.com/tc39/proposal-arraybuffer-base64) operate on real binary data and are available everywhere `Uint8Array` is. Prefer [`Uint8Array.fromBase64()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64) and [`Uint8Array#toBase64()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64) instead.

> [!NOTE]
> `Buffer.from(string, 'base64')` returns a `Buffer`, while `Uint8Array.fromBase64(string)` returns a plain `Uint8Array`. The fix is offered as a suggestion since the result type differs.

## Examples

```js
// ❌
const bytes = atob(base64);

// ❌
const bytes = Buffer.from(base64, 'base64');

// ✅
const bytes = Uint8Array.fromBase64(base64);
```

```js
// ❌
const base64 = buffer.toString('base64');

// ✅
const base64 = buffer.toBase64();
```

To convert text instead of binary data, encode it first:

```js
// ❌
const base64 = btoa(text);
const text = atob(base64);

// ✅
const base64 = new TextEncoder().encode(text).toBase64();
const text = new TextDecoder().decode(Uint8Array.fromBase64(base64));
```

The base64 methods support the `base64url` alphabet too:

```js
// ❌
const bytes = Buffer.from(base64url, 'base64url');

// ✅
const bytes = Uint8Array.fromBase64(base64url, {alphabet: 'base64url'});
```

> [!TIP]
> The [`uint8array-extras`](https://github.com/sindresorhus/uint8array-extras) package offers `stringToBase64` and `base64ToString` helpers for the text case.
