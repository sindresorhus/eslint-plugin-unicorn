# Prefer `EventTarget` over `EventEmitter`

✅ This rule is _disabled_ in the `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

While [`EventEmitter`](https://nodejs.org/api/events.html#class-eventemitter) is only available in Node.js, [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget) is also available in _Deno_ and browsers.

This rule reduces the bundle size and makes your code more cross-platform friendly.

See the [differences](https://nodejs.org/api/events.html#eventtarget-and-event-api) between `EventEmitter` and `EventTarget`.

## Fail

```js
import {EventEmitter} from 'node:event';

class Foo extends EventEmitter {}
```

```js
const emitter = new EventEmitter();
```

## Pass

```js
class Foo extends EventTarget {}
```

```js
const target = new EventTarget();
```
