# Move function definitions to the highest possible scope

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A function definition should be placed as close to the top-level scope as possible without breaking its captured values. This improves readability, [directly improves performance](https://stackoverflow.com/a/81329/207247) and allows JavaScript engines to [better optimize performance](https://ponyfoo.com/articles/javascript-performance-pitfalls-v8#optimization-limit).

## Fail

```js
export function doFoo(foo) {
	// Does not capture anything from the scope, can be moved to the outer scope
	function doBar(bar) {
		return bar === 'bar';
	}

	return doBar;
}

function doFoo(foo) {
	const doBar = bar => {
		return bar === 'bar';
	};
}
```

## Pass

```js
function doBar(bar) {
	return bar === 'bar';
}

export function doFoo(foo) {
	return doBar;
}

export function doFoo(foo) {
	function doBar(bar) {
		return bar === 'bar' && foo.doBar(bar);
	}

	return doBar;
}
```

## Options

### checkArrowFunctions

Type: `boolean`\
Default: `true`

Pass `"checkArrowFunctions": false` to disable linting of arrow functions.

## Limitations

This rule does not detect or remove extraneous code blocks inside of functions:

```js
function doFoo(foo) {
	{
		function doBar(bar) {
			return bar;
		}
	}

	return foo;
}
```

It also ignores functions that contain `JSXElement` references:

```jsx
function doFoo(FooComponent) {
	function Bar() {
		return <FooComponent/>;
	}

	return Bar;
};
```

[Immediately invoked function expressions (IIFE)](https://en.wikipedia.org/wiki/Immediately_invoked_function_expression) are ignored:

```js
(function () {
	function doFoo(bar) {
		return bar;
	}
})();
```

[Built-in Hooks in React](https://reactjs.org/docs/hooks-reference.html) are ignored:

```js
useEffect(() => {
	async function getItems() {}

	getItems();
}, [])
```
