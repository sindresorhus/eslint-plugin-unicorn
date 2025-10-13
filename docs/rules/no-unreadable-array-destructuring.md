# Disallow unreadable array destructuring

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Destructuring is very useful, but it can also make some code harder to read. This rule prevents ignoring consecutive values when destructuring from an array.

## Examples

```js
// ✅
const [foo] = parts;
```

```js
// ✅
const [, foo] = parts;
```

```js
// ❌
const [,, foo] = parts;

// ✅
const foo = parts[2];
```

```js
// ❌
const [,,, foo] = parts;

// ✅
const foo = parts[3];
```

```js
// ✅
const [,...rest] = parts;
```

```js
// ❌
const [,,...rest] = parts;

// ✅
const rest = parts.slice(2);
```

## Note

You might have to modify the built-in [`prefer-destructuring`](https://eslint.org/docs/rules/prefer-destructuring) rule to be compatible with this one:

```json
{
	"rules": {
		"prefer-destructuring": [
			"error",
			{
				"object": true,
				"array": false
			}
		]
	}
}
```
