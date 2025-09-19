# Prefer `EventTarget` over `EventEmitter`

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

While [`EventEmitter`](https://nodejs.org/api/events.html#class-eventemitter) is only available in Node.js, [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget) is also available in _Deno_ and browsers.

This rule reduces the bundle size and makes your code more cross-platform friendly.

See the [differences](https://nodejs.org/api/events.html#eventtarget-and-event-api) between `EventEmitter` and `EventTarget`.

## Examples

```js
// ❌
import {EventEmitter} from 'node:event';

class Foo extends EventEmitter {}

// ✅
class Foo extends EventTarget {}
```

```js
// ❌
import {EventEmitter} from 'node:event';

const emitter = new EventEmitter();

// ✅
const target = new EventTarget();
```
