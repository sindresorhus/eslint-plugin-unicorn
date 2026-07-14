# consistent-boolean-name

📝 Enforce consistent naming for boolean names.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

By default, this rule checks boolean variables, parameters, and functions. When `checkProperties` is enabled, it also checks object, class, and TypeScript property and method names.

Boolean names should start with a prefix that makes the boolean meaning clear.

Names that start with a boolean prefix should also refer to booleans or boolean-returning functions. Unknown values are ignored.

Reports for property and method names, and reports for non-boolean values using boolean prefixes, do not provide rename suggestions.

The default prefixes are:

- `is`
- `are`
- `has`
- `have`
- `can`
- `should`
- `was`
- `were`
- `did`
- `will`
- `requires`

The plural prefixes (`are`, `have`, `were`) allow names for boolean collections, like `areFilesValid`.

The prefix must be a distinct word part. `isReady`, `is_ready`, and `IS_READY` are allowed, but `island` is not considered to have the `is` prefix.

React hook function bindings are checked after the required `use` prefix. For example, `useIsReady` is treated as a boolean hook name, while `useReady` is not. `ignore` patterns still match the original source name, like `useReady`.

React refs initialized with a boolean-like value may use boolean prefixes when the binding name ends in `Ref` or `Reference`, such as `isMountedRef`, `hasConsentRef`, or `hasConsentReference`. The suffix identifies the binding as a ref object. The binding must not be reassigned after initialization.

Vue refs initialized with a boolean-like value by a direct `ref()` call, and computed refs initialized with a boolean-returning function by a direct `computed()` call, may use boolean prefixes, such as `isBranch` or `hasDepartment`. The binding must not be reassigned after initialization.

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
const hasName = 'Sindre';

// ✅
const name = 'Sindre';
```

```js
// ❌
function hasTitle() {
	return 'Unicorn';
}

// ✅
function getTitle() {
	return 'Unicorn';
}
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
	are: true,
	has: true,
	have: true,
	can: true,
	should: true,
	was: true,
	were: true,
	did: true,
	will: true,
	requires: true,
}
```

The `prefixes` option is merged with the defaults. Set a prefix to `true` to allow it for boolean names and reserve it for boolean-like values. Set a prefix to `false` to disable it in both directions.

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

### ignore

Type: `Array<string | RegExp>`\
Default: `[]`

Names matching any of these patterns are not checked. Strings are treated as regular expressions, so they match anywhere in the name unless anchored with `^` and `$`.

```js
'unicorn/consistent-boolean-name': [
	'error',
	{
		ignore: [
			'value',
			'^completed$',
		],
	},
]
```

With the above config, these would pass:

```js
const value = true;
const completed = true;
```
