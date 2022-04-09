# Prefer EventTarget instead of EventEmitter

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

<!-- /RULE_NOTICE -->

While `EventEmitter` could be used in only Node.js, `EventTarget` exist in *Deno* and *Browser* too.

This rule could potentially reduce the bundle size, and make your code more cross-platform friendly.

You can check their [differences](https://nodejs.org/api/events.html#eventtarget-and-event-api) between `EventEmitter` and `EventTarget`.

## Fail

```js
import EventEmitter from 'node:event'

class Foo extends EventEmitter {

}
```

```js
const emitter = new EventEmitter;
```

## Pass

```js
class Foo extends EventTarget {

}
```

```js
const target = new EventTarget;
```
