# Enforce no spaces between braces

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

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
