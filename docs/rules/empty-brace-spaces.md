# Enforce no spaces between braces

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

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
