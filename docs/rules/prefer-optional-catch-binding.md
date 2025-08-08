# Prefer omitting the `catch` binding parameter

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

If the `catch` binding parameter is not used, it should be omitted.

## Fail

```js
try {} catch (notUsedError) {}
```

```js
try {} catch ({message}) {}
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
