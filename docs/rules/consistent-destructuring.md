# Use destructured variables over properties

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

💡 Some problems reported by this rule are manually fixable by editor [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

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
