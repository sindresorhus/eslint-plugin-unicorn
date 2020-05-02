# Prefer omitting the `catch` binding parameter

If the `catch` binding parameter is not used, it should be omitted.

This rule is fixable.

## Fail

```js
try {} catch (usedError) {}
```

## Pass

```js
try {} catch {}
```

```js
try {} catch (error) {
	console.error(error);
}
```
