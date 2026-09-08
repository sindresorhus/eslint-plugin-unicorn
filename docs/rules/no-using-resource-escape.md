# no-using-resource-escape

📝 Disallow returning or exporting resources declared with `using`.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->

Resources declared with [`using` or `await using`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using) are disposed when their owning scope exits. Returning or exporting the resource, or a function that captures it, can expose an already-disposed resource to later code.

This rule checks direct resource values and capturing functions in returns and exports. It also checks array elements, object property values and methods, conditional and logical expressions, and the last operand of a sequence expression. Functions can be inline or referenced through an unreassigned local function declaration or a `const` initialized directly with a function.

The rule supports JavaScript and TypeScript without type information. It is off by default and has no options or automatic fixes, since the appropriate repair depends on who should own the resource.

## Examples

```js
// ❌
function openResource() {
	using resource = acquire();
	return resource;
}

// ✅ Consume the resource before disposal and return the result.
function readResource() {
	using resource = acquire();
	return resource.read();
}
```

```js
// ❌
function createReader() {
	using resource = acquire();
	return () => resource.read();
}

// ✅ Acquire and dispose a resource for each call.
function createReader() {
	return () => {
		using resource = acquire();
		return resource.read();
	};
}
```

```js
// ❌
using resource = acquire();
export {resource};

// ❌
await using connection = await connect();
export const query = () => connection.query();

// ✅ Keep resource ownership inside the exported operation.
export async function query() {
	await using connection = await connect();
	return await connection.query();
}
```

A nested helper can return an outer resource while its owning scope remains active:

```js
// ✅
function readResource() {
	using resource = acquire();

	function getResource() {
		return resource;
	}

	return getResource().read();
}
```

## Limitations

This rule checks common, local escape patterns, not all possible uses after disposal. It does not track resource aliases, destructured bindings, mutable values, assignments to outer state, classes, indirect helper calls, or resources obtained from properties. Calls and awaited expressions are treated as opaque values. Spread contents, computed property keys, type-only exports and references, re-exports, and `yield` are ignored.

Timers, event listeners, and general callbacks are not checked because their execution may finish before disposal. The rule also does not analyze whether capturing functions are actually called after disposal or whether a particular resource remains usable after disposal.

For promises returned before resource disposal finishes, use [`@typescript-eslint/return-await`](https://typescript-eslint.io/rules/return-await/). Adding `await` does not repair returning an ordinary disposed resource or a closure capturing it.

See also [`prefer-dispose`](./prefer-dispose.md), which recommends resource-management declarations, and [`no-invalid-well-known-symbol-methods`](./no-invalid-well-known-symbol-methods.md), which checks disposer implementations.
