# no-repeated-call-wrappers

📝 Disallow repeating the same wrapper at every call to a function.

🚫 Disabled by default.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When every caller converts a function's result in the same way, consider making that conversion part of the function. This can remove repetition and make the function's return value match what its callers need.

This rule reports a local function or native private method (`#method`) when every call is immediately wrapped in the same single-argument constructor, such as `new Set(getWords(text))`, or the same primitive conversion, such as `Number(readCount(object))`. It reports once on the function or method, rather than at each call site.

This rule is excluded from the recommended preset because keeping conversions in callers can be an intentional design choice.

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

- Requires at least two distinct call sites and the same wrapper binding, accessible inside the function.
- Ignores exported, reassigned, or escaped functions, async functions, generators, optional calls, and direct recursion.
- Public methods, TypeScript `private` methods, and private function fields are excluded.

No fixes or suggestions are provided because moving wrappers can change return types, evaluation timing, and exception handling.
