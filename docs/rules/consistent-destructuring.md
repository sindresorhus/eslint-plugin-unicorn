# Use destructured variables over properties

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
