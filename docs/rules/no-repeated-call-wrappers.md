# no-repeated-call-wrappers

📝 Disallow repeating the same wrapper at every call to a function.

🚫 Disabled by default.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When every caller converts a function's result in the same way, consider making that conversion part of the function. This can remove repetition and make the function's return value match what its callers need.

This rule reports a local function or native private method (`#method`) when every call is immediately wrapped in the same single-argument constructor, such as `new Set(getWords(text))`, or the same primitive conversion, such as `Number(readCount(object))`. It reports once on the function or method, rather than at each call site.

## Examples

```js
// ❌
const getWords = text => text.toLowerCase().split(' ');
const firstWords = new Set(getWords(first));
const secondWords = new Set(getWords(second));

// ✅
const getUniqueWords = text => new Set(text.toLowerCase().split(' '));
const firstWords = getUniqueWords(first);
const secondWords = getUniqueWords(second);
```

```js
// ❌
const getEntries = object => Object.entries(object);
const firstMap = new Map(getEntries(first));
const secondMap = new Map(getEntries(second));

// ✅
const getMap = object => new Map(Object.entries(object));
const firstMap = getMap(first);
const secondMap = getMap(second);
```

```js
// ❌
const readCount = object => object.count;
const firstCount = Number(readCount(first));
const secondCount = Number(readCount(second));

// ✅
const getCount = object => Number(object.count);
const firstCount = getCount(first);
const secondCount = getCount(second);
```

```js
// ❌
class Words {
	#getWords(text) {
		return text.split(' ');
	}

	read(first, second) {
		return [new Set(this.#getWords(first)), new Set(this.#getWords(second))];
	}
}

// ✅
class Words {
	#getUniqueWords(text) {
		return new Set(text.split(' '));
	}

	read(first, second) {
		return [this.#getUniqueWords(first), this.#getUniqueWords(second)];
	}
}
```

Functions with an unwrapped call are ignored:

```js
// ✅
const getWords = text => text.split(' ');
const uniqueWords = new Set(getWords(first));
const words = getWords(second);
```

## Scope and limitations

- Local function declarations, function expressions, arrow functions, and native private methods (`#method`) are checked. At least two distinct call sites are required. A call inside a loop still counts as one call site.
- Exported functions, imported functions, public methods, TypeScript methods declared with the `private` keyword, function-valued private fields, reassigned functions, and functions with unknown callers are ignored. Passing a function or private method as a callback, creating an alias, or accessing its properties counts as an unknown caller.
- Async functions, generators, optional calls, and functions called from within their own definition are ignored. Indirect recursion is not analyzed.
- Wrappers must be direct `new Constructor(call())` expressions or calls to `String`, `Number`, `Boolean`, or `BigInt`, with one argument and an identifier callee. The wrapper must refer to the same binding at every call site and be accessible inside the function or private method. Calls and constructors are distinct: `Number(call())` and `new Number(call())` do not match. Explicit wrapper type arguments must match.
- TypeScript assertions around the called function are supported, including `getWords!(text)` and `(getWords as Getter)(text)`.
- Wrappers around arguments, arbitrary function-call wrappers, wrapper member access, intermediate expressions, and TypeScript assertions around call results are ignored.
- Files with direct `eval`, `with`, or non-strict block function declarations are ignored.

This rule does not provide automatic fixes or editor suggestions. Moving a wrapper changes the return contract and may require renaming the function or updating its types. Review evaluation timing, exception handling, and whether the conversion belongs in the function before making the change. Keeping conversions in callers can be an intentional design choice; disable this rule for those functions.
