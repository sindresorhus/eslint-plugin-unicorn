# prefer-queue-microtask

📝 Prefer `queueMicrotask()` over `process.nextTick()`, `setImmediate()`, and `setTimeout(…, 0)`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`queueMicrotask()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/queueMicrotask) is a portable way to queue a microtask in browsers and Node.js.

Prefer it over [`process.nextTick()`](https://nodejs.org/api/process.html#processnexttickcallback-args) for most userland code. The rule can also check [`setImmediate()`](https://nodejs.org/api/timers.html#setimmediatecallback-args) and `setTimeout(…, 0)` when enabled.

## Examples

```js
// ❌
process.nextTick(callback);

// ✅
queueMicrotask(callback);
```

```js
// ❌
process.nextTick(callback, value);

// ✅
queueMicrotask(() => callback(value));
```

## Options

Type: `object`

### checkSetImmediate

Type: `boolean`\
Default: `false`

Check `setImmediate(callback)`.

```js
/* eslint unicorn/prefer-queue-microtask: ["error", {"checkSetImmediate": true}] */

// ❌
setImmediate(callback);

// ✅
queueMicrotask(callback);
```

### checkSetTimeout

Type: `boolean`\
Default: `false`

Check `setTimeout(callback, 0)`.

```js
/* eslint unicorn/prefer-queue-microtask: ["error", {"checkSetTimeout": true}] */

// ❌
setTimeout(callback, 0);

// ✅
queueMicrotask(callback);
```
