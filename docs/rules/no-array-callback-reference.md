# no-array-callback-reference

📝 Prevent passing a function reference directly to iterator methods.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Passing functions to iterator methods can cause issues when the function is changed without realizing that the iterator passes 2 more parameters to it. **This also applies when using TypeScript,** albeit only if the function accepts the same parameter type used by the iterator method.

This rule intentionally reports locally declared callbacks too. Use an inline wrapper when you want to make the callback arguments explicit.

Type predicate callbacks are allowed for `.every()`, `.filter()`, `.find()`, and `.findLast()` because wrapping them can fail to preserve TypeScript's predicate overload narrowing.

When TypeScript type information is available, this rule ignores receivers that are known not to be arrays or typed arrays. Untyped JavaScript and unknown TypeScript receivers are still checked heuristically, so use the `ignore` option or an inline disable for unsupported non-array APIs that intentionally share array method names.

Suppose you have a `unicorn` module:

```js
const unicorn = x => x + 1;

export default unicorn;
```

You can then use it like this:

```js
import unicorn from 'unicorn';

[1, 2, 3].map(unicorn);
//=> [2, 3, 4]
```

The `unicorn` module now does a minor version that adds another argument:

```js
const unicorn = (x, y) => x + (y ? y : 1);

export default unicorn;
```

Your code will now return something different and probably break for users because it is now passing the index of the item as second argument.

```js
import unicorn from 'unicorn';

[1, 2, 3].map(unicorn);
//=> [2, 3, 5]
```

This rule helps safely call the function with the expected number of parameters:

```js
import unicorn from 'unicorn';

[1, 2, 3].map(x => unicorn(x));
//=> [2, 3, 4]
```

## Examples

```js
// ❌
const foo = array.map(callback);

// ✅
const foo = array.map(element => callback(element));
```

```js
// ✅
const foo = array.map(Boolean);
```

```js
// ❌
array.forEach(callback);

// ✅
array.forEach(element => {
	callback(element);
});
```

```js
// ❌
const foo = array.every(callback);

// ✅
const foo = array.every(element => callback(element));
```

```js
// ❌
const foo = array.filter(callback);

// ✅
const foo = array.filter(element => callback(element));
```

```js
// ✅
const foo = array.filter(Boolean);
```

```js
// ❌
const foo = array.find(callback);

// ✅
const foo = array.find(element => callback(element));
```

```js
// ❌
const index = array.findIndex(callback);

// ✅
const index = array.findIndex(element => callback(element));
```

```js
// ❌
const foo = array.some(callback);

// ✅
const foo = array.some(element => callback(element));
```

```js
// ❌
const foo = array.reduce(callback, 0);

// ✅
const foo = array.reduce(
	(accumulator, element) => accumulator + callback(element),
	0
);
```

```js
// ❌
const foo = array.reduceRight(callback, []);

// ✅
const foo = array.reduceRight(
	(accumulator, element) => [
		...accumulator,
		callback(element)
	],
	[]
);
```

```js
// ❌
const foo = array.flatMap(callback);

// ✅
const foo = array.flatMap(element => callback(element));
```

```js
// ❌
array.forEach(someFunction({foo: 'bar'}));

// ✅
const callback = someFunction({foo: 'bar'});

array.forEach(element => {
	callback(element);
});
```

```js
// ❌
array.forEach(callback, thisArgument);

// ✅
array.forEach(function (element) {
	callback(element, this);
}, thisArgument);
```

```js
// ✅
function readFile(filename) {
	return fs.readFile(filename, 'utf8');
}

Promise.map(filenames, readFile);
```

## Options

Type: `object`

### ignore

Type: `string[]`

Callees to ignore. The callee is matched against the object the iterator method is called on, so `"Angular"` ignores all `Angular.<method>(…)` calls.

`Promise`, `React.Children`, `Children`, `lodash`, `underscore`, `_`, `Async`, `async`, `this`, `$`, and `jQuery` are always ignored.

Example:

```js
{
	'unicorn/no-array-callback-reference': [
		'error',
		{
			ignore: [
				'Angular',
				'P'
			]
		}
	]
}
```

```js
/* eslint unicorn/no-array-callback-reference: ["error", {"ignore": ["Angular"]}] */
Angular.forEach(list, fn); // Passes
```
