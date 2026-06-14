# consistent-boolean-name

📝 Enforce consistent naming for boolean names.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

By default, this rule checks boolean variables, parameters, and functions. When `checkProperties` is enabled, it also checks object, class, and TypeScript property and method names.

Boolean names should start with a prefix that makes the boolean meaning clear.

Reports for property and method names do not provide rename suggestions.

The default prefixes are:

- `is`
- `has`
- `can`
- `should`
- `was`
- `did`
- `will`

The prefix must be a distinct word part. `isReady`, `is_ready`, and `IS_READY` are allowed, but `island` is not considered to have the `is` prefix.

This rule intentionally does not check destructuring bindings, imports, class names, or catch parameters.

TypeScript type annotation checks resolve local type aliases and callable interfaces, but not qualified or namespaced type references.

This rule is only automatically fixable when a non-global, non-exported, non-ambient variable binding can be safely renamed to the first enabled prefix without adding a collision suffix. Other safe rename candidates are still provided as editor suggestions.

## Examples

```js
// ❌
const completed = true;

// ✅
const isCompleted = true;
```

```js
// ❌
const completed = progress === 100;

// ✅
const hasCompleted = progress === 100;
```

```js
// ❌
const completed = Boolean(value);

// ✅
const isCompleted = Boolean(value);
```

```js
// ❌
function download(showProgress = false) {}

// ✅
function download(shouldShowProgress = false) {}
```

```ts
// ❌
const completed: boolean = true;

// ✅
const isCompleted: boolean = true;
```

```js
// ❌
function completed() {
	return true;
}

// ✅
function isCompleted() {
	return true;
}
```

```ts
// ❌
function download(showProgress: boolean) {}

// ✅
function download(shouldShowProgress: boolean) {}
```

```js
// ✅
// Properties are ignored unless `checkProperties` is enabled.
const task = {
	completed: progress === 100,
};
```

## Options

### checkProperties

Type: `boolean`\
Default: `false`

Check object, class, and TypeScript property and method names.

```js
'unicorn/consistent-boolean-name': [
	'error',
	{
		checkProperties: true,
	},
]
```

With `checkProperties: true`, this would fail:

```js
const task = {
	completed: true,
};
```

```ts
interface Task {
	completed: boolean;
}
```

And this would pass:

```js
const task = {
	isCompleted: true,
};
```

```ts
interface Task {
	isCompleted: boolean;
	canComplete(): boolean;
}
```

### prefixes

Type: `Record<string, boolean>`\
Default:

```js
{
	is: true,
	has: true,
	can: true,
	should: true,
	was: true,
	did: true,
	will: true,
}
```

The `prefixes` option is merged with the defaults. Set a prefix to `true` to allow it, or `false` to disable it.

```js
'unicorn/consistent-boolean-name': [
	'error',
	{
		prefixes: {
			needs: true,
			did: false,
		},
	},
]
```

With the above config, this would pass:

```js
const needsUpdate = true;
```

And this would fail:

```js
const didUpdate = true;
```
