# prefer-single-call

📝 Enforce combining multiple `Array#push()`, `Element#classList.{add,remove}()`, and `importScripts()` into one call.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[`Array#push()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push), [`Element#classList.add()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/classList), [`Element#classList.remove()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/classList), and [`importScripts`](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts) accepts multiple arguments. Multiple calls should be combined into one.

## Examples

```js
// ❌
foo.push(1);
foo.push(2, 3);

// ✅
foo.push(1, 2, 3);
```

```js
// ❌
element.classList.add('foo');
element.classList.add('bar', 'baz');

// ✅
element.classList.add('foo', 'bar', 'baz');
```

```js
// ❌
importScripts("https://example.com/foo.js");
importScripts("https://example.com/bar.js");

// ✅
importScripts(
	"https://example.com/foo.js",
	"https://example.com/bar.js",
);
```

## Options

Type: `object`

### ignore

Type: `string[]`

Functions to ignore.

`stream.push`, `this.push`, and `this.stream.push` are ignored by default.

Example:

```js
{
	'unicorn/prefer-single-call': [
		'error',
		{
			ignore: [
				'readable.push',
				'foo.stream.push'
			]
		}
	]
}
```

```js
/* eslint unicorn/prefer-single-call: ["error", {"ignore": ["readable"]}] */
import {Readable} from 'node:stream';

const readable = new Readable();
readable.push('one');
readable.push('another');
readable.push(null);
```
