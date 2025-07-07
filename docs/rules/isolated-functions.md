# Prevent usage of variables from outside the scope of isolated functions

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Some functions need to be isolated from their surrounding scope due to execution context constraints. For example, functions passed to [`makeSynchronous()`](https://github.com/sindresorhus/make-synchronous) are executed in a worker or subprocess and cannot access variables from outside their scope. This rule helps identify when functions are using external variables that may cause runtime errors.

Common scenarios where functions must be isolated:

- Functions passed to `makeSynchronous()` (executed in worker)
- Functions that will be serialized via `Function.prototype.toString()`
- Server actions or other remote execution contexts
- Functions with specific JSDoc annotations

By default, this rule uses ESLint's language options globals and allows global variables (like `console`, `fetch`, etc.) in isolated functions, but prevents usage of variables from the surrounding scope.

## Examples

```js
import makeSynchronous from 'make-synchronous';

export const fetchSync = () => {
	const url = 'https://example.com';

	const getText = makeSynchronous(async () => {
		const res = await fetch(url); // ❌ 'url' is not defined in isolated function scope
		return res.text();
	});

	console.log(getText());
};

// ✅ Define all variables within isolated function's scope
export const fetchSync = () => {
	const getText = makeSynchronous(async () => {
		const url = 'https://example.com'; // Variable defined within function scope
		const res = await fetch(url);
		return res.text();
	});

	console.log(getText());
};

// ✅ Alternative: Pass as parameter
export const fetchSync = () => {
	const getText = makeSynchronous(async (url) => { // Variable passed as parameter
		const res = await fetch(url);
		return res.text();
	});

	console.log(getText('https://example.com'));
};
```
```

```js
const foo = 'hi';

/** @isolated */
function abc() {
	return foo.slice(); // ❌ 'foo' is not defined in isolated function scope
}

// ✅
/** @isolated */
function abc() {
	const foo = 'hi'; // Variable defined within function scope
	return foo.slice();
}
```

## Options

Type: `object`

### functions

Type: `string[]`\
Default: `['makeSynchronous']`

Array of function names that create isolated execution contexts. Functions passed as arguments to these functions will be considered isolated.

### selectors

Type: `string[]`\
Default: `[]`

Array of [ESLint selectors](https://eslint.org/docs/developer-guide/selectors) to identify isolated functions. Useful for custom naming conventions or framework-specific patterns.

```js
{
	'unicorn/isolated-functions': [
		'error',
		{
			selectors: [
				'FunctionDeclaration[id.name=/lambdaHandler.*/]'
			]
		}
	]
}
```

### comments

Type: `string[]`\
Default: `['@isolated']`

Array of comment strings that mark functions as isolated. Functions with JSDoc comments containing these strings will be considered isolated.

```js
{
	'unicorn/isolated-functions': [
		'error',
		{
			comments: [
				'@isolated',
				'@remote'
			]
		}
	]
}
```

### globals

Type: `object`\
Default: `undefined` (uses ESLint's language options globals)

Controls how global variables are handled. When not specified, uses ESLint's language options globals. When specified as an object, each key is a global variable name and the value controls its behavior:

- `'readonly'`: Global variable is allowed but cannot be written to (depreacted form `false` also accepted)
- `'writable'`: Global variable is allowed and can be read/written (deprecated forms `true` and `'writeable'` also accepted)
- `'off'`: Global variable is not allowed

```js
{
	'unicorn/isolated-functions': [
		'error',
		{
			globals: {
				console: 'writable',     // Allowed and writable
				fetch: 'readonly',       // Allowed but readonly
				process: 'off'           // Not allowed
			}
		}
	]
}
```

## Examples

### Custom function names

```js
{
	'unicorn/isolated-functions': [
		'error',
		{
			functions: [
				'makeSynchronous',
				'createWorker',
				'serializeFunction'
			]
		}
	]
}
```

### Lambda function naming convention

```js
{
	'unicorn/isolated-functions': [
		'error',
		{
			selectors: [
				'FunctionDeclaration[id.name=/lambdaHandler.*/]'
			]
		}
	]
}
```

```js
const foo = 'hi';

function lambdaHandlerFoo() { // ❌ Will be flagged as isolated
	return foo.slice();
}

function someOtherFunction() { // ✅ Not flagged
	return foo.slice();
}

createLambda({
	name: 'fooLambda',
	code: lambdaHandlerFoo.toString(), // Function will be serialized
});
```

### Default behavior (using ESLint's language options)

```js
// Uses ESLint's language options globals by default
makeSynchronous(async () => {
	console.log('Starting...'); // ✅ Allowed if console is in language options
	const response = await fetch('https://api.example.com'); // ✅ Allowed if fetch is in language options
	return response.text();
});
```

### Disallowing all globals

```js
{
	'unicorn/isolated-functions': [
		'error',
		{
			globals: {} // Empty object disallows all globals
		}
	]
}
```

```js
// ❌ All globals are disallowed
makeSynchronous(async () => {
	console.log('Starting...'); // ❌ 'console' is not allowed
	const response = await fetch('https://api.example.com'); // ❌ 'fetch' is not allowed
	return response.text();
});
```

### Allowing specific globals

```js
{
	'unicorn/isolated-functions': [
		'error',
		{
			globals: {
				console: 'writable',     // Allowed and writable
				fetch: 'readonly',       // Allowed but readonly
				URL: 'readonly'          // Allowed but readonly
			}
		}
	]
}
```

```js
// ✅ All globals used are explicitly allowed
makeSynchronous(async () => {
	console.log('Starting...'); // ✅ Allowed global
	const response = await fetch('https://api.example.com'); // ✅ Allowed global
	const url = new URL(response.url); // ✅ Allowed global
	return response.text();
});

makeSynchronous(async () => {
	const response = await fetch('https://api.example.com', {
		headers: {
			'Authorization': `Bearer ${process.env.API_TOKEN}` // ❌ 'process' is not in allowed globals
		}
	});
	const url = new URL(response.url);
	return response.text();
});

// ❌ Attempting to write to readonly global
makeSynchronous(async () => {
	fetch = null; // ❌ 'fetch' is readonly
	console.log('Starting...');
});
```
