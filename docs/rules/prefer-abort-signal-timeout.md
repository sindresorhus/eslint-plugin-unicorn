# prefer-abort-signal-timeout

📝 Prefer `AbortSignal.timeout()` over manually aborting an `AbortController` with `setTimeout()`.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`AbortSignal.timeout()` creates an `AbortSignal` that automatically aborts after a delay. It avoids the extra `AbortController` and manual timer setup.

This rule only reports the simple adjacent-statement pattern where the controller is otherwise only used through `.signal`.

## Examples

```js
// ❌
const abortController = new AbortController();
setTimeout(() => abortController.abort(), 1000);

await fetch(url, {signal: abortController.signal});
```

```js
// ✅
const abortSignal = AbortSignal.timeout(1000);

await fetch(url, {signal: abortSignal});
```

Controllers with other behavior are intentionally ignored.

```js
// ✅
const abortController = new AbortController();
setTimeout(() => abortController.abort(), 1000);
button.addEventListener('click', () => abortController.abort());

await fetch(url, {signal: abortController.signal});
```
