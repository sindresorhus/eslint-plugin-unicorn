# Prefer consistent function scoping

A function definition should be placed as close to the top level scope as possible without breaking it's captured values.

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
	const doBar = (bar) => {
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
