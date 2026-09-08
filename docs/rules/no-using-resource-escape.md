# no-using-resource-escape

📝 Disallow returning or exporting resources declared with `using`, including through capturing functions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->

Resources declared with [`using` or `await using`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using) are disposed when their owning scope exits. Returning or exporting the resource, or a function that captures it, can expose an already-disposed resource to later code.

The rule checks direct resource values and capturing functions in returns and exports, including through array elements, object property values and methods, conditional and logical expressions, and the last operand of a sequence expression. Functions can be inline or referenced through an unreassigned local function declaration or a `const` initialized directly with a function.

It supports JavaScript and TypeScript without type information. It has no options or automatic fix because ownership must be decided by the application.

## Examples

```js
function openResource() {
	using resource = acquire();
	return resource; // ❌ Disposed before the caller receives it.
}

function readResource() {
	using resource = acquire();
	return resource.read(); // ✅ Return the result instead.
}
```

```js
function createDisposedReader() {
	using resource = acquire();
	return () => resource.read(); // ❌ Captures a disposed resource.
}

function createReader() {
	return () => {
		using resource = acquire();
		return resource.read(); // ✅ Own the resource inside the returned function.
	};
}
```

```js
using resource = acquire();
export {resource}; // ❌

export async function query() {
	await using connection = await connect();
	return await connection.query(); // ✅
}
```

A nested helper may return an outer resource when the result remains inside the owning scope.

## Limitations

The rule does not track aliases, destructured or mutable bindings, assignments to outer state, classes, or property-derived resources. It ignores calls, awaited expressions, spreads, computed object keys, `yield`, re-exports, and type-only exports and references.

It also ignores callbacks passed to timers, event listeners, promises, and other functions because their lifetime is unknown. TypeScript function instantiation expressions such as `return read<Resource>` and overloaded function references are unsupported.

To require awaiting returned promises before resources are disposed, use [`@typescript-eslint/return-await`](https://typescript-eslint.io/rules/return-await/). Adding `await` does not repair returning an ordinary disposed resource or a closure capturing it.

See also [`prefer-dispose`](./prefer-dispose.md), which recommends resource-management declarations, and [`no-invalid-well-known-symbol-methods`](./no-invalid-well-known-symbol-methods.md), which checks disposer implementations.
