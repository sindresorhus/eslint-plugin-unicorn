# prefer-observer-apis

📝 Prefer observer APIs over resize and scroll listeners with layout reads.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer `ResizeObserver` and `IntersectionObserver` over `resize` and `scroll` listeners that synchronously read layout.

This rule only reports listeners with layout or viewport geometry reads. Plain scroll position listeners are ignored because an observer API is not always a better replacement.

## Examples

```js
// ❌
window.addEventListener('resize', () => {
	element.classList.toggle('is-small', element.offsetWidth < 500);
});

// ✅
new ResizeObserver(entries => {
	for (const entry of entries) {
		entry.target.classList.toggle('is-small', entry.contentRect.width < 500);
	}
}).observe(element);
```

```js
// ❌
window.addEventListener('scroll', () => {
	element.classList.toggle('is-visible', element.getBoundingClientRect().top < window.innerHeight);
});

// ✅
new IntersectionObserver(entries => {
	for (const entry of entries) {
		entry.target.classList.toggle('is-visible', entry.isIntersecting);
	}
}).observe(element);
```

```js
// ✅
window.addEventListener('scroll', () => {
	updateScrollPosition(window.scrollY);
});
```

## Limitations

Only inline listener functions, local function declarations, and local `const` function listeners are checked. Function declaration reassignments are not tracked. Dynamic event names are ignored unless TypeScript type information proves the value is exactly `'resize'` or `'scroll'`. Direct type assertions on wider dynamic names are ignored. Opaque listener references are ignored to avoid false positives.
