# Prefer ES modules over CommonJS

Prefer use ESM over legacy CommonJS module.

1. Forbid `use strict` directive.

	ESM scripts use Strict Mode by default.

1. Forbid `Global Return`

	This is a CommonJS-only feature.

1. Forbid global variables `__dirname` and `__filename`.

	It's not available in ESM.

1. Forbid `require(…)`

	`import …` is preferred in ESM.

1. Forbid `exports` and `module.exports`

	`export …` is preferred in ESM.


## Fail

```js
'use strict';

// …
```

```js
if (foo) {
	return;
}

// …
```

```js
const file = path.join(__dirname, 'foo.js');
```

```js
const {fromPairs} = require('lodash');
```

```js
module.exports = foo;
```

```js
exports.foo = foo;
```

## Pass


```js
function run() {
	if (foo) {
		return;
	}

	// …
}

run();
```

```js
const file = fileURLToPath(new URL('foo.js', import.meta.url));
```

```js
import {fromPairs} from 'lodash-es';
```

```js
export default foo;
```

```js
export {foo};
```

## Resources

- [Get Ready For ESM](https://blog.sindresorhus.com/get-ready-for-esm-aa53530b3f77) by @sindresorhus
