# catch-error-name

📝 Enforce a specific parameter name in catch clauses.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Applies to

- `try/catch` clauses handlers
- `promise.catch(…)` handlers
- `promise.then(onFulfilled, …)` handlers

The desired name is [configurable](#name), but defaults to `error`.

The following names are ignored:

- `_`, but only if the error is not used.
- Descriptive names, for example, `fsError` or `authError`.
- Names matching [`options.ignore`](#ignore).

## Examples

```js
// ❌
try {} catch (badName) {}

// ✅
try {} catch (error) {}
```

```js
// ❌
promise.catch(badName => {});

// ✅
promise.catch(error => {});
```

```js
// ❌
promise.then(undefined, badName => {});

// ✅
promise.then(undefined, error => {});
```

```js
// ❌
try {} catch (_) {
	console.log(_);
}

// ✅
try {} catch (_) {
	console.log(foo);
}
```

```js
// ✅
// Descriptive name is allowed
try {} catch (fsError) {}
```

```js
// ✅
// `error_` is allowed because of shadowed variables
try {} catch (error_) {
	const error = new Error('🦄');
}
```

## Options

### name

Type: `string`\
Default: `'error'`

You can set the `name` option like this:

```js
"unicorn/catch-error-name": [
	"error",
	{
		"name": "exception"
	}
]
```

### ignore

Type: `Array<string | RegExp>`\
Default: `[]`

This option lets you specify a regex pattern for matches to ignore.

When a string is given, it's interpreted as a regular expressions inside a string. Needed for ESLint config in JSON.

```js
"unicorn/catch-error-name": [
	"error",
	{
		"ignore": [
			"^error\\d*$",
			/^ignore/i
		]
	}
]
```

With `^unicorn$`, this would fail:

```js
try {} catch (pony) {}
```

And this would pass:

```js
try {} catch (unicorn) {}
```

## Tip

In order to avoid shadowing in nested catch clauses, the auto-fix rule appends underscores to the identifier name.
