# Forbid of comparison `typeof` with `'undefined'` if the variable is declared, imported or variable is a function parameter

🔧 _This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems)._

## Fail

```js
const foo = 'bar';
typeof foo === 'undefined';
```

```js
import foo from 'bar';

typeof foo !== 'undefined';
```

```js
const fn = (foo) => typeof foo === 'undefined';
```

```js
function fn(foo) {
	typeof foo !== 'undefined';
}
```

## Pass

```js
typeof notDeclared !== 'undefined';
```

```js
const foo = 'bar';
foo === undefined;
```

```js
import foo from 'bar';

foo !== undefined;
```

```js
const fn = (foo) => foo === undefined;
```

```js
function fn(foo) {
	foo !== undefined;
}
```
