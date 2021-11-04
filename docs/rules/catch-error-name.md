# Enforce a specific parameter name in catch clauses

✅ The `"extends": "plugin:unicorn/recommended"` property in a configuration file enables this rule.

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

Applies to

- `try/catch` clauses handlers
- `promise.catch(…)` handlers
- `promise.then(onFulfilled, …)` handlers

The desired name is [configurable](#name), but defaults to `error`.

The following names are ignored:

- `_`, but only if the error is not used.
- Descriptive names, for example, `fsError` or `authError`.
- Names matching [`options.ignore`](#ignore).

## Fail

```js
try {} catch (badName) {}
```

```js
// `_` is not allowed if it's used
try {} catch (_) {
	console.log(_);
}
```

```js
promise.catch(badName => {});
```

```js
promise.then(undefined, badName => {});
```

## Pass

```js
try {} catch (error) {}
```

```js
promise.catch(error => {});
```

```js
promise.then(undefined, error => {});
```

```js
// `_` is allowed when it's not used
try {} catch (_) {
	console.log(foo);
}
```

```js
// Descriptive name is allowed
try {} catch (fsError) {}
```

```js
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
