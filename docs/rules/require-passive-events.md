# require-passive-events

📝 Require passive event listeners for high-frequency events.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Require passive event listeners for high-frequency events.

Passive listeners let the browser handle scrolling without waiting to see whether the handler calls `preventDefault()`, improving responsiveness.

## Examples

```js
// ❌
window.addEventListener('wheel', () => {});

// ✅
window.addEventListener('wheel', () => {}, {passive: true});
```

```js
// ✅
window.addEventListener('wheel', event => {
	event.preventDefault();
});
```

```js
// ✅
window.addEventListener('click', () => {});
```

## Limitations

Only inline listener functions are checked. Named listeners, dynamic options, options with spreads, and opaque event parameter usage are ignored to avoid false positives.
