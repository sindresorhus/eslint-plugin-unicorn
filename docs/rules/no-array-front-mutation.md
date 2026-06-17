# no-array-front-mutation

📝 Disallow front-of-array mutation.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Forbid `Array#shift()` and `Array#unshift()` in projects that want to avoid mutating the front of arrays.

These methods are not always wrong. Small one-off uses are often fine. This rule exists for codebases that prefer to avoid front-of-array mutation because repeated FIFO-style array consumption can be inefficient and is often better represented with iteration, an index cursor, or a queue.

Use intent-specific alternatives:

- Iterate without consuming the array.
- Keep an index cursor instead of repeatedly calling `shift()`.
- Use `pop()` and `push()` when processing from the end preserves the intended order.
- Use a queue, such as [`yocto-queue`](https://github.com/sindresorhus/yocto-queue), for repeated FIFO work.

This rule is disabled in both the `recommended` and `unopinionated` configs because `shift()` and `unshift()` can be readable and acceptable outside hot paths.

## Examples

```js
// ❌
array.shift();
```

```js
// ❌
array.unshift(item);
```

```js
// ✅
for (const item of array) {
	process(item);
}
```

```js
// ✅
import Queue from 'yocto-queue';

const queue = new Queue();
queue.enqueue(item);
queue.dequeue();
```

## Limitations

This rule only checks direct `.shift()` and `.unshift()` calls. It intentionally does not track aliases, computed method names, optional method calls like `array.shift?.()`, or `Array.prototype.shift.call(array)`.

The rule also skips common stream-style `.unshift()` paths by name, such as `stream.unshift(chunk)` and `process.stdin.unshift(chunk)`. If one of those names refers to an array, the call is still ignored.
