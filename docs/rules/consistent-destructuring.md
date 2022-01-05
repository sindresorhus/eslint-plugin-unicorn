# Use destructured variables over properties

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

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
