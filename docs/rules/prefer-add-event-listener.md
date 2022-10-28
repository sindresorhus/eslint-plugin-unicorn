# Prefer `.addEventListener()` and `.removeEventListener()` over `on`-functions

✅ This rule is enabled in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces the use of `.addEventListener()` and `.removeEventListener()` over their `on`-function counterparts. For example, `foo.addEventListener('click', handler);` is preferred over `foo.onclick = handler;` for HTML DOM Events. There are [numerous advantages of using `addEventListener`](https://stackoverflow.com/questions/6348494/addeventlistener-vs-onclick/35093997#35093997). Some of these advantages include registering unlimited event handlers and optionally having the event handler invoked only once.

This rule is fixable (only for `.addEventListener()`).

## Fail

```js
foo.onclick = () => {};
```

```js
foo.onkeydown = () => {};
```

```js
foo.bar.onclick = onClick;
```

```js
foo.onclick = null;
```

## Pass

```js
foo.addEventListener('click', () => {});
```

```js
foo.addEventListener('keydown', () => {});
```

```js
foo.bar.addEventListener('click', onClick);
```

```js
foo.removeEventListener('click', onClick);
```

## Options

### excludedPackages

```js
"unicorn/prefer-add-event-listener": [
	"error", {
		"excludedPackages": [
			"koa",
			"sax"
		]
	}
]
```

This option lets you specify a list of packages that disable the rule when imported. By default, `koa` and `sax` are listed.

With `koa`, this would still pass:

```js
const Koa = require('koa');
const app = new Koa();

app.onerror = () => {};
```
