# Move function definitions to the highest possible scope

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
