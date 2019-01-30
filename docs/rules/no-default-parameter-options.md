# Enforce the use of object spreading instead of passing default parameters with an object

Default parameters should not be passed to a function through an object. The `options = {a: false}` parameter works fine if only used with one option. As soon as additional options are added, you risk replacing the whole `options = {a: false, b: true}` object when passing only one options `{a: true}`. For this reason, object spreading should be used instead.


## Fail

```js
const foo = (options = {a: false}) => {};
```

```js
const foo = (options = {a: false, b: true}) => {};
```

```js
const fooDefaults = {
    a: false,
    b: true
};

const foo = (options = fooDefaults) => {};
```


## Pass

```js
const foo = (options = {}) => {};
```

```js
const foo = options => {
    options = {
        a: false,
        b: true,
        ...options
    };
};
```
