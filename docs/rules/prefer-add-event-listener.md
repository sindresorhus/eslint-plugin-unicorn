# Prefer `.addEventListener()` and `.removeEventListener()` over `on`-functions

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforces the use of `.addEventListener()` and `.removeEventListener()` over their `on`-function counterparts. For example, `foo.addEventListener('click', handler);` is preferred over `foo.onclick = handler;` for HTML DOM Events. There are [numerous advantages of using `addEventListener`](https://stackoverflow.com/questions/6348494/addeventlistener-vs-onclick/35093997#35093997). Some of these advantages include registering unlimited event handlers and optionally having the event handler invoked only once.

In most cases, it is safe to replace the `on`-function with the corresponding `addEventListener` counterpart, which is why this rule contains a fixer that swaps it automatically for you. For example, you might be assigning some static functionality to a UI button when the page first loads, and in this context, the functionality of the two would be equivalent.

However, __if you are assigning a listener in a dynamic context, then this rule's auto-fixer will make your code bugged__. This is because the `on` assignment replaces the current listener, but the `addEventListener` adds an additional listener in addition to the ones that are already assigned. For example, if you are dynamically updating the functionality of a button as new data comes in, then using `addEventListener` would not work, since it would cause N functions to be invoked for every previous data state. In this context, you should probably disable this lint rule and use the `on` form, since [removing existing event listeners is not possible](https://stackoverflow.com/questions/9251837/how-to-remove-all-listeners-in-an-element).

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
import Koa from 'koa';

const app = new Koa();

app.onerror = () => {};
```
