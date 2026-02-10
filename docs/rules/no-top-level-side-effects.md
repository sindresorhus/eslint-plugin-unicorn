# Disallow top-level side effects

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Top-level executable statements run as soon as the module is imported. This rule disallows top-level side effects and encourages exporting functions instead.

## Examples

```js
// ❌ Side-effectful top-level statements
document.title = 'gone';
init();
if (foo) bar();
export default doThing();

// ✅ Declarations and exports
export function init() {
	document.title = 'gone';
}
const response = fetch();
export default 1;
```
