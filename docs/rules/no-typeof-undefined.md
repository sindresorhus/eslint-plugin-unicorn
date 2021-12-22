# Forbid of comparison `typeof` with `'undefined'` if the variable is declared, imported or variable is a function parameter

🔧 _This rule
is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems)._

## Fail

```js
var withVar;
typeof withVar == 'undefined';
```

```js
let withLet;
typeof withLet != 'undefined';
```

```js
const withConst = 'foo';
typeof withConst === 'undefined';
```

```js
import withImport from 'foo';

typeof withImport !== 'undefined';
```

```js
const foo = (withArrowFnParameter) => typeof withArrowFnParameter === 'undefined';
```

```js
function foo(withFnParameter) {
	typeof withFnParameter !== 'undefined';
}
```

## Pass

```js
typeof notDeclared !== 'undefined';
```

```js
var withVar;
withVar == undefined;
```

```js
let withLet;
withLet != undefined;
```

```js
const withConst = 'foo';
withConst === undefined;
```

```js
import withImport from 'foo';

withImport !== undefined;
```

```js
const foo = (withArrowFnParameter) => withArrowFnParameter === undefined;
```

```js
function foo(withFnParameter) {
  withFnParameter !== undefined;
}
```
