# Use destructured variables over properties

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

<!-- end rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces the use of already destructured objects and their variables over accessing each property individually. Previous destructurings are easily missed which leads to an inconsistent code style.

This rule is partly fixable. It does not fix nested destructuring.

## Fail

```js
const {a} = foo;
console.log(a, foo.b);
```

```js
const {a} = foo;
console.log(foo.a);
```

```js
const {
	a: {
		b
	}
} = foo;
console.log(foo.a.c);
```

```js
const {bar} = foo;
const {a} = foo.bar;
```

## Pass

```js
const {a} = foo;
console.log(a);
```

```js
console.log(foo.a, foo.b);
```

```js
const {a} = foo;
console.log(a, foo.b());
```

```js
const {a} = foo.bar;
console.log(foo.bar);
```
