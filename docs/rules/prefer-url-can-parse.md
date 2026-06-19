# prefer-url-can-parse

📝 Prefer `URL.canParse()` over constructing a `URL` in a try/catch for validation.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Prefer `URL.canParse()` over constructing a `URL` in a `try`/`catch` block for validation.

`URL.canParse()` returns whether a string or stringifiable input can be parsed as a URL without constructing a `URL` object.

This rule intentionally only reports simple boolean validation patterns. It assumes the URL input is a normal string or stringifiable value and does not rewrite arbitrary `try`/`catch` control flow.

## Examples

```js
// ❌
try {
	new URL(value);
	return true;
} catch {
	return false;
}

// ✅
return URL.canParse(value);
```

```js
// ❌
let valid;
try {
	new URL(value, base);
	valid = true;
} catch {
	valid = false;
}

// ✅
let valid = URL.canParse(value, base);
```
