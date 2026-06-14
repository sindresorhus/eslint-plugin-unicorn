# no-top-level-assignment-in-function

📝 Disallow assigning to top-level variables from inside functions.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Assigning to top-level variables from inside functions creates hidden shared state. A function can then change the result of later calls, or break when it becomes recursive, reentrant, or async.

Keep state local to the function, pass it explicitly, return it, or put intentional shared state in an object. If you truly need a module-level cache or other shared state, use an ESLint disable comment.

This rule only reports direct writes to top-level bindings. It ignores property mutations and variables from non-top-level outer scopes.

## Examples

```js
// ❌
let cache;

function build() {
	cache = new Map();
}
```

```js
// ✅
function build() {
	const cache = new Map();
}
```

```js
// ❌
let index = 0;

const next = () => index++;
```

```js
// ✅
const state = {
	index: 0,
};

const next = () => state.index++;
```
