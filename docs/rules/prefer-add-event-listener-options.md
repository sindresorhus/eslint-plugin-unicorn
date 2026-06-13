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
// ❌ - Boolean form doesn't show intent and limits options
element.addEventListener('click', handleClick, true);

// ✅ - Options object is explicit and extensible
element.addEventListener('click', handleClick, {capture: true});
```

```js
// ❌ - False is the default and unclear
element.addEventListener('scroll', handleScroll, false);

// ✅ - Explicit options object
element.addEventListener('scroll', handleScroll, {capture: false});
```

```js
// ✅ - The options object enables better features
element.addEventListener('touchmove', handleScroll, {
	passive: true, // Improves scrolling performance
	capture: true, // Capture phase handling
});
```

```js
// ✅ - Use 'once' for automatic listener removal
element.addEventListener('load', initializeOnce, {once: true});

// ✅ - Use 'signal' for AbortController cleanup
const controller = new AbortController();
element.addEventListener('click', handler, {signal: controller.signal});
// Later: controller.abort(); // Removes listener
```
