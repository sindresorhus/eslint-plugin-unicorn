# no-top-level-side-effects

📝 Disallow top-level side effects.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Modules that cause side effects at initialization time are harder to tree-shake, test, and reason about. This rule enforces that modules are [side-effect-free](https://webpack.js.org/guides/tree-shaking/) by disallowing top-level statements that execute code at load time.

Files with no exports (scripts, entry points) and files with a [hashbang](https://en.wikipedia.org/wiki/Shebang_(Unix)) line (`#!/usr/bin/env node`) are ignored, as those are intentional execution contexts.

Assignments are allowed because they are commonly needed for top-level configuration objects.

## Examples

```js
// ❌
foo();
export {};

// ❌
condition && foo();
export {};

// ❌
void foo();
export {};

// ❌
export default foo();

// ❌
export default await foo();

// ✅ — not flagged (file has no exports)
foo();

// ✅ — not flagged (hashbang = CLI script)
#!/usr/bin/env node
foo();
export {};

// ✅ — assignments are allowed
const server = createServer();
export default server;

// ✅ — export const is allowed
export const config = buildConfig();

// ✅ — pure annotation suppresses the error
/* @__PURE__ */ foo();
export {};
```
