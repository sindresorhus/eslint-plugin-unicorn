# prefer-uint8array-hex

📝 Prefer `Uint8Array#toHex()` and `Uint8Array.fromHex()` over manual and Buffer hex conversions.

🚫 Disabled by default.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer [`Uint8Array#toHex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toHex) and [`Uint8Array.fromHex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromHex) over manual byte-to-hex conversion and Node.js `Buffer` hex conversions.

> [!NOTE]
> Enable this rule only when your target runtimes support these methods, or you provide a polyfill. They are not available in Node.js 22, so this rule is disabled in the recommended configs.

## Examples

### Encoding

The rule recognizes spread followed by `map()`, `Array.from()` followed by `map()`, `Array.from()` with a mapping callback, and borrowed map calls through `Array.prototype.map.call()` or `[].map.call()`, each followed by `join('')`. Callbacks must be synchronous, non-generator functions with exactly one identifier parameter and an expression body or a body containing only a single `return` statement. The callback must return one of these expressions:

- `byte.toString(16).padStart(2, '0')`
- `('0' + byte.toString(16)).slice(-2)` or the `'00'` prefix variant
- `` `0${byte.toString(16)}`.slice(-2) `` or the `00` prefix variant

```js
const bytes = new Uint8Array([0, 15, 255]);

// ❌
const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');

// ❌
const hex = Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');

// ❌
const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

// ❌
const hex = Array.from(bytes, byte => ('0' + byte.toString(16)).slice(-2)).join('');

// ❌
const hex = Array.prototype.map.call(bytes, byte => `0${byte.toString(16)}`.slice(-2)).join('');

// ❌
const hex = [].map.call(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

// ✅
const hex = bytes.toHex();
```

These conversions are automatically fixed when the input is known to be a `Uint8Array` or `Buffer`, using syntax, constant initializers, TypeScript annotations, or TypeScript type information. Unknown inputs receive a suggestion instead. Known incompatible inputs, including ordinary arrays and other typed arrays, are ignored.

The rule also recognizes `buffer.toString('hex')`, including case variations of `'hex'`. Known Buffer receivers are automatically fixed; unknown receivers receive a suggestion.

```js
const bytes = new Uint8Array([0, 15, 255]);

// ❌
const hex = Buffer.from(bytes).toString('hex');

// ✅
const hex = bytes.toHex();

const buffer = Buffer.alloc(16);

// ❌
const hex = buffer.toString('hex');

// ✅
const hex = buffer.toHex();
```

`Buffer.from()` is removed only when its sole argument is known to be a `Uint8Array` or `Buffer`. Otherwise it is retained, preserving input encoding, numeric conversion, and view bounds:

```js
// ❌
const hex = Buffer.from(buffer, offset, length).toString('hex');

// ✅
const hex = Buffer.from(buffer, offset, length).toHex();
```

### Decoding

The rule suggests `Uint8Array.fromHex()` for `Buffer.from(text, 'hex')` and regex-based byte parsing wrapped in `new Uint8Array()` or `Uint8Array.from()`.

```js
// ❌
const bytes = Buffer.from(text, 'hex');

// ❌
const bytes = new Uint8Array(text.match(/.{2}/g).map(pair => Number.parseInt(pair, 16)));

// ❌
const bytes = Uint8Array.from(text.match(/.{2}/g), pair => parseInt(pair, 16));

// ✅
const bytes = Uint8Array.fromHex(text);
```

Supported regex patterns are `/../g`, `/.{2}/g`, `/.{1,2}/g`, `/[0-9a-f]{2}/g`, and `/[\da-f]{2}/g`. Additional `i`, `s`, and `u` or `v` flags are supported. The result of `match()` may have a `?? []` or `|| []` fallback. Both `parseInt(pair, 16)` and `Number.parseInt(pair, 16)` callbacks are supported.

> [!IMPORTANT]
> Decoding replacements are suggestions because malformed-input handling differs. `Uint8Array.fromHex()` rejects odd lengths, invalid hex characters, whitespace, and `0x` prefixes. Existing Buffer and manual decoders may truncate, skip characters, or produce different values. Empty-input handling may also differ. Replacing Buffer decoding additionally changes the result from `Buffer` to `Uint8Array`.

Buffer decoding is reported without a suggestion when the result is immediately accessed through a member, such as `Buffer.from(text, 'hex').toString()`, since the remaining operation may require a Buffer.

Calls with inputs known to be non-string are ignored because replacing them with `Uint8Array.fromHex()` may be invalid.

## Limitations

The rule does not recognize pipelines split across statements, imperative loops, reducers, lookup tables, other padding idioms, arbitrary regex patterns, optional operations, computed method names, `super` method calls, or `toString('hex', start, end)` ranges. Direct typed-array `map()` encoders are ignored because typed-array mapping coerces the callback's strings back into numbers. Legacy `.substr()` callbacks can be normalized to `.slice()` by [`prefer-string-slice`](./prefer-string-slice.md) before this rule recognizes them.

Replacements containing comments are reported without a fix or suggestion, so comments are not lost or moved. Compatibility fallbacks are not detected automatically; disable this rule where an older-runtime implementation is intentional.

The [`prefer-uint8array-base64`](./prefer-uint8array-base64.md) rule covers base64 conversions separately.
