# Prevent passing a function reference directly to iterator methods

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


## Fail

```js
const fn = x => x + 1;

[1, 2, 3].map(fn);
```

```js
const fn = x => console.log(x);

[1, 2, 3].forEach(fn);
```

```js
const fn = x => x < 10;

[1, 2, 3].every(fn);
```

```js
const fn = x => x % 2;

[1, 2, 3].filter(fn);
```

```js
const fn = x => x === 1;

[1, 2, 3].find(fn);
```

```js
const fn = x => x === 1;

[1, 2, 3].findIndex(fn);
```

```js
const fn = x => x === 2;

[1, 2, 3].some(fn);
```

```js
const fn = (a, b) => a + b;

[1, 2, 3].reduce(fn, 0);
```

```js
const fn = (a, b) => a.concat(b);

[1, 2, 3].reduceRight(fn, []);
```

```js
const fn = x => x === 2;

[1, 2, 3].map(m({foo: 'bar'}));
```


## Pass

```js
const fn = x => x + 1;

[1, 2, 3].map(x => fn(x));
```

```js
const fn = x => console.log(x);

[1, 2, 3].forEach(x => fn(x));
```

```js
const fn = x => x < 10;

[1, 2, 3].every(x => fn(x));
```

```js
const fn = x => x % 2;

[1, 2, 3].filter(x => fn(x));
```

```js
[undefined, 2, 3].filter(Boolean);
```

```js
const fn = x => x === 1;

[1, 2, 3].find(x => fn(x));
```

```js
const fn = x => x === 1;

[1, 2, 3].findIndex(x => fn(x));
```

```js
const fn = x => x === 2;

[1, 2, 3].some(x => fn(x));
```

```js
const fn = (a, b) => a + b;

[1, 2, 3].reduce((a, b) => fn(a, b), 0);
```

```js
const fn = (a, b) => a.concat(b);

[1, 2, 3].reduceRight((a, b) => fn(a, b), []);
```

```js
const fn = (a, b) => a.concat(b);

[1, 2, 3].reduceRight(fn, []);
```

```js
const fn = x => x === 2;

[1, 2, 3].map(x => m({foo: 'bar'})(x));
```

```js
const fn = x => x === 2;

Promise.map(filenames, fn);
```
