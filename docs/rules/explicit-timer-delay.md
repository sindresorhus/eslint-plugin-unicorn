# Enforce or disallow explicit `delay` argument for `setTimeout()` and `setInterval()`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When using [`setTimeout()`](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout) or [`setInterval()`](https://developer.mozilla.org/en-US/docs/Web/API/setInterval), the `delay` parameter is optional and defaults to `0`. This rule allows you to enforce whether the `delay` argument should always be explicitly provided or omitted when it's `0`.

This provides flexibility for different team preferences:

- `"always"` (default): Require explicit `delay` argument for clarity
- `"never"`: Disallow explicit `0` delay (prefer implicit default)

## Examples

### With `"always"` (default)

```js
// ❌
setTimeout(() => console.log('Hello'));
setInterval(callback);
window.setTimeout(() => console.log('Hello'));
globalThis.setInterval(callback);

// ✅
setTimeout(() => console.log('Hello'), 0);
setInterval(callback, 0);
setTimeout(() => console.log('Hello'), 1000);
window.setTimeout(() => console.log('Hello'), 0);
globalThis.setInterval(callback, 100);
```

### With `"never"`

```js
// ❌
setTimeout(() => console.log('Hello'), 0);
setInterval(callback, 0);
window.setTimeout(() => console.log('Hello'), 0);
globalThis.setInterval(callback, 0);

// ✅
setTimeout(() => console.log('Hello'));
setInterval(callback);
setTimeout(() => console.log('Hello'), 1000);
window.setTimeout(() => console.log('Hello'));
globalThis.setInterval(callback, 100);
```

## Options

Type: `string`

Values: `"always"` (default) | `"never"`

### `"always"`

Requires an explicit `delay` argument for all `setTimeout()` and `setInterval()` calls.

```json
{
	"unicorn/explicit-timer-delay": ["error", "always"]
}
```

### `"never"`

Disallows an explicit `delay` argument when it's `0`. Non-zero delays are still allowed.

```json
{
	"unicorn/explicit-timer-delay": ["error", "never"]
}
```
