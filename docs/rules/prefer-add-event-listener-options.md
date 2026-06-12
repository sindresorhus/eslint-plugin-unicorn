# prefer-add-event-listener-options

📝 Prefer an options object over a boolean in `.addEventListener()`.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer the options object form of `.addEventListener()` over the legacy boolean `useCapture` argument.

The object form makes the capture behavior explicit and leaves room for other listener options like `passive`, `once`, and `signal`.

## Examples

```js
// ❌
element.addEventListener('click', listener, true);

// ✅
element.addEventListener('click', listener, {capture: true});
```

```js
// ❌
element.addEventListener('click', listener, false);

// ✅
element.addEventListener('click', listener, {capture: false});
```
