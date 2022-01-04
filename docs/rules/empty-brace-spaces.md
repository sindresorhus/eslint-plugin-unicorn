# Enforce no spaces between braces

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

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
