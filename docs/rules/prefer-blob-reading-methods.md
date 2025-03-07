# Prefer `Blob#arrayBuffer()` over `FileReader#readAsArrayBuffer(…)` and `Blob#text()` over `FileReader#readAsText(…)`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`FileReader` predates promises, and the newer [`Blob#arrayBuffer()`](https://developer.mozilla.org/en-US/docs/Web/API/Blob/arrayBuffer) and [`Blob#text()`](https://developer.mozilla.org/en-US/docs/Web/API/Blob/text) methods are much cleaner and easier to use.

## Fail

```js
const arrayBuffer = await new Promise((resolve, reject) => {
	const fileReader = new FileReader();
	fileReader.addEventListener('load', () => {
		resolve(fileReader.result);
	});
	fileReader.addEventListener('error', () => {
		reject(fileReader.error);
	});
	fileReader.readAsArrayBuffer(blob);
});
```

```js
fileReader.readAsText(blob);
```

## Pass

```js
const arrayBuffer = await blob.arrayBuffer();
```

```js
const text = await blob.text();
```

```js
fileReader.readAsText(blob, 'ascii');
```

```js
fileReader.readAsDataURL(blob);
```
