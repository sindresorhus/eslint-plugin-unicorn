# Prevents passing a function directly to iterator methods

Prevents passing a function directly to an iterator method to make it more clear with the function accepts.


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
