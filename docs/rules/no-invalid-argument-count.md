# no-invalid-argument-count

📝 Disallow calling functions and constructors with an invalid number of arguments.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

JavaScript allows functions and constructors to be called with too few or too many arguments. This can hide refactoring mistakes when a local function signature changes but some call sites are not updated, and it can silently ignore values passed to built-in APIs.

This rule checks simple local functions where the expected argument count is clear. It also checks a conservative default set of built-in APIs such as global functions, timers, animation callbacks, dialogs, window methods, `console`, `Math`, `Number`, `Object`, `Promise`, `Reflect`, `Atomics`, `Intl`, `JSON`, `Array`, typed arrays, collection constructors, errors, `Symbol`, `Iterator`, `Temporal`, `URL`, `URLSearchParams`, `URLPattern`, `structuredClone`, `WebAssembly`, `fetch`, Fetch API classes, encoding classes, abort helpers, events, geometry classes, `crypto`, `crypto.subtle`, `performance`, `navigator` sub-APIs, Web Share, Credential Management, Scheduler APIs, CSS namespace methods, CSS Typed OM, Web Storage, IndexedDB and IDB key ranges, CacheStorage, Cookie Store, Custom Elements, WebAuthn statics, common `document` methods, history/location/navigation methods, workers, notifications, Trusted Types, image/canvas helpers, Web Speech, WebVTT, Web Audio constructors and nodes, media constructors, Web Animations constructors, WebRTC constructors, WebCodecs constructors, WebGPU entry points and errors, WebTransport constructors, Web Streams, compression streams, observers, DOM parser/serializer, XPath/XMLHttpRequest/XSLT constructors, channels, sockets, Node.js `Buffer` and `process` APIs, and file/blob/image-data constructors.

## Examples

```js
// ❌
function sum(first, second) {
	return first + second;
}

sum(1);
```

```js
// ❌
const sum = (first, second) => first + second;

sum(1, 2, 3);
```

```js
// ✅
function sum(first, second) {
	return first + second;
}

sum(1, 2);
```

```js
// ✅
function sum(first, second = 0) {
	return first + second;
}

sum(1);
```

```js
// ✅
function join(first, ...rest) {
	return [first, ...rest].join('');
}

join(1, 2, 3);
```

```js
// ❌
Object.is(value);
```

```js
// ❌
Math.random(seed);
```

```js
// ❌
new Set(iterable, extra);
```

```js
// ✅
Object.is(left, right);
```

```js
// ✅
Math.random();
```

```js
// ✅
new Set(iterable);
```

## Options

You can configure additional call or constructor patterns for project-specific APIs. A value can be:

- A number for an exact argument count.
- An array of allowed exact argument counts.
- An object with `min` and/or `max` for an inclusive range.

When both `min` and `max` are specified, `min` must be less than or equal to `max`. Invalid ranges are rejected when the config is loaded.

Configured patterns override default built-in patterns with the same name.

Patterns are dot-separated identifier paths. `*` matches exactly one path segment. Prefix a pattern with `new` and a space to match constructor calls. For example, `foo.bar` matches `foo.bar()`, `*.bar` matches `foo.bar()` and `baz.bar()`, and `new Foo.Bar` matches `new Foo.Bar()`. Computed properties are ignored. Custom patterns are syntactic and are not checked against global shadowing, unless they override a default built-in pattern.

```js
{
	rules: {
		'unicorn/no-invalid-argument-count': [
			'error',
			{
				foo: 2,
				'*.drawImage': [3, 5, 9],
				'*.addEventListener': {min: 2, max: 3},
				'new Set': {max: 1},
			}
		]
	}
}
```

Configured API patterns report normal argument-count mismatches:

```js
// ❌
context.drawImage(image, dx);
```

```js
// ✅
context.drawImage(image, dx, dy);
```

They also report spread arguments when the actual argument count cannot be proven valid:

```js
// ❌
new Set(...values);
```

```js
// ✅
new Set(values);
```

## Limitations

For inferred local functions, this rule intentionally only checks local function declarations, `const` function expressions, `const` arrow functions, and direct IIFEs. Imported functions, member calls, constructors, dynamic/reassigned function variables, overloaded TypeScript declarations, and calls with spread arguments are ignored unless they match a configured API pattern.

Default built-in checks only apply when the built-in global is not shadowed.
