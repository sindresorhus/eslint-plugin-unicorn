# no-top-level-side-effects

💼 This rule is not enabled in any [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow top-level side effects.

When an ES module is imported, all of its top-level code runs immediately. If that code has observable side effects (calling functions, mutating DOM, spawning timers, etc.) then importing the file becomes risky — the order of imports matters, tree-shaking becomes impossible, and the module is harder to test.

Files that have no `export` declarations (entry points and scripts) and files that start with a [hashbang](https://en.wikipedia.org/wiki/Shebang_(Unix)) are exempt from this rule.

## Examples

```js
// ❌
document.title = 'gone';
export const a = 1;
```

```js
// ❌
fetch('https://api.example.com/report');
export const a = 1;
```

```js
// ❌
new App();
export const a = 1;
```

```js
// ❌
if (condition) {
	doSomething();
}
export const a = 1;
```

```js
// ❌
export default setup();
```

```js
// ✅
export function init() {
	document.title = 'gone';
}
```

```js
// ✅
const x = fetch('url'); // variable declarations are allowed
export const a = 1;
```

```js
// ✅
export default function foo() {}
```

```js
// ✅
export default -1;
```

## Pure annotations

Calls annotated with `/* @__PURE__ */` (or `/* #__PURE__ */`) are exempt, as are all calls to functions declared with `/* @__NO_SIDE_EFFECTS__ */`.

```js
// ✅ — annotated at call site
/* @__PURE__ */ setup();
export const a = 1;
```

```js
// ✅ — function annotated as side-effect free
/* @__NO_SIDE_EFFECTS__ */
function createApp() { return {}; }

export default createApp();
```

## CJS modules

CommonJS export assignments (`module.exports = …`, `module.exports.foo = …`, `exports.foo = …`) are allowed and count as "having exports" for the purpose of this rule.
