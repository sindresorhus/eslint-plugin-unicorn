# Prevent passing a function reference directly to iterator methods

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Passing functions to iterator methods can cause issues when the function is changed without realizing that the iterator passes 2 more parameters to it. **This also applies when using TypeScript,** albeit only if the function accepts the same parameter type used by the iterator method.

Suppose you have a `unicorn` module:

```js
module.exports = x => x + 1;
```

You can then use it like this:

```js
const unicorn = require('unicorn');

[1, 2, 3].map(unicorn);
//=> [2, 3, 4]
```

The `unicorn` module now does a minor version that adds another argument:

```js
module.exports = (x, y) => x + (y ? y : 1);
```

Your code will now return something different and probably break for users because it is now passing the index of the item as second argument.

```js
const unicorn = require('unicorn');

[1, 2, 3].map(unicorn);
//=> [2, 3, 5]
```

This rule helps safely call the function with the expected number of parameters:

```js
const unicorn = require('unicorn');

[1, 2, 3].map(x => unicorn(x));
//=> [2, 3, 4]
```

## Fail

```js
const foo = array.map(callback);
```

```js
array.forEach(callback);
```

```js
const foo = array.every(callback);
```

```js
const foo = array.filter(callback);
```

```js
const foo = array.find(callback);
```

```js
const index = array.findIndex(callback);
```

```js
const foo = array.some(callback);
```

```js
const foo = array.reduce(callback, 0);
```

```js
const foo = array.reduceRight(callback, []);
```

```js
const foo = array.flatMap(callback);
```

```js
array.forEach(someFunction({foo: 'bar'}));
```

```js
array.forEach(callback, thisArgument);
```

## Pass

```js
const foo = array.map(element => callback(element));
```

```js
const foo = array.map(Boolean);
```

```js
array.forEach(element => {
	callback(element);
});
```

```js
const foo = array.every(element => callback(element));
```

```js
const foo = array.filter(element => callback(element));
```

```js
const foo = array.filter(Boolean);
```

```js
const foo = array.find(element => callback(element));
```

```js
const index = array.findIndex(element => callback(element));
```

```js
const foo = array.some(element => callback(element));
```

```js
const foo = array.reduce(
	(accumulator, element) => accumulator + callback(element),
	0
);
```

```js
const foo = array.reduceRight(
	(accumulator, element) => [
		...accumulator,
		callback(element)
	],
	[]
);
```

```js
const foo = array.flatMap(element => callback(element));
```

```js
const callback = someFunction({foo: 'bar'});

array.forEach(element => {
	callback(element);
});
```

```js
array.forEach(function (element) {
	callback(element, this);
}, thisArgument);
```

```js
function readFile(filename) {
	return fs.readFile(filename, 'utf8');
}

Promise.map(filenames, readFile);
```
