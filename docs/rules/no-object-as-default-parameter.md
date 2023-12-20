# Disallow the use of objects as default parameters

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Default parameters should not be passed to a function through an object literal. The `foo = {a: false}` parameter works fine if only used with one option. As soon as additional options are added, you risk replacing the whole `foo = {a: false, b: true}` object when passing only one option: `{a: true}`. For this reason, object destructuring should be used instead.

## Fail

```js
const abc = (foo = {a: false}) => {};
```

```js
function foo({a} = {a: false}) {}
```

```js
const abc = (foo = {a: false, b: 123}) => {};
```

## Pass

```js
const abc = (foo = {}) => {};
```

```js
function foo(options) {
	const {a} = {a: false, ...options};
}
```

```js
const abc = (foo = false) => {};
```

```js
const foo = ({a = false, b = 123}) => {};
```
