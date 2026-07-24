# prefer-single-call

📝 Enforce combining multiple `Array#{push,unshift}()`, `Element#classList.{add,remove}()`, and `importScripts()` into one call.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

These methods accept multiple arguments and should be combined into a single call when possible:

- [`Array#push()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push)
- [`Array#unshift()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/unshift)
- [`Element#classList.add()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/classList)
- [`Element#classList.remove()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/classList)
- [`importScripts()`](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts)

Combining calls is more efficient, cleaner, and reduces code duplication.

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
foo.unshift(1);
foo.unshift(2, 3);

// ✅
foo.unshift(2, 3, 1);
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

`stream.push`, `stream.unshift`, `this.push`, `this.unshift`, `this.stream.push`, `this.stream.unshift`, `process.stdin.push`, `process.stdin.unshift`, `process.stdout.push`, `process.stdout.unshift`, `process.stderr.push`, and `process.stderr.unshift` are ignored by default.

`push()` and `unshift()` calls are also skipped when the receiver is known not to be an array, so this option is rarely needed in TypeScript. A locally declared type is recognized from its annotation alone, while a receiver whose type comes from another module, such as a stream, needs [type information](https://typescript-eslint.io/getting-started/typed-linting/).

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
