# Prefer `EventTarget` over `EventEmitter`

<!-- end rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

While [`EventEmitter`](https://nodejs.org/api/events.html#class-eventemitter) is only available in Node.js, [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget) is also available in *Deno* and browsers.

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
