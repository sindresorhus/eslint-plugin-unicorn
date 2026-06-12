# no-global-object-property-assignment

📝 Disallow assigning properties on the global object.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow assigning properties on the global object.

Global object mutation makes it hard to see where state is created and can accidentally overwrite existing globals. Use module scope, explicit imports and exports, dependency injection, or a local singleton instead.

If assigning a global property is intentional, disable this rule locally.

## Examples

```js
// ❌
globalThis.foo = value;

// ❌
window.foo += 1;

// ❌
self.foo ||= value;
```

```js
// ✅
export const foo = value;

// ✅
const singleton = {
	foo: value,
};

// ✅
globalThis.foo;
```
