# Prefer omitted the `catch` binding parameter.

If the `catch` binding parameter is not used, it should be omitted.

This rule is fixable.

## Fail

```js
try {} catch (unused) {}
```

## Pass

```js
try {} catch {}
```

```js
try {} catch (used) {}
```
