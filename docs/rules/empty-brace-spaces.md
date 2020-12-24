# Enforce no spaces between braces

This rule is fixable.

## Fail

```js
class Unicorn {
}
```

```js
try {
	foo();
} catch { }
```

## Pass

```js
class Unicorn {}
```

```js
try {
	foo();
} catch {}
```
