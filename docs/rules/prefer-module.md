# Prefer ES modules over CommonJS

Prefer use [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) over legacy CommonJS module.

1. Forbids `'use strict'` directive.

	ESM scripts use “Strict Mode” by default.

1. Forbids “Global Return”

	This is a CommonJS-only feature.

1. Forbids the global variables `__dirname` and `__filename`.

	They are not available in ESM.

	Replacements:

	```js
	import {fileURLToPath} from 'url';
	import path from 'path';

	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	```

1. Forbids `require(…)`

	`require(…)` can be replaced by `import …` or `import(…)`.

1. Forbids `exports` and `module.exports`

	`export …` should be used in ESM.

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
const content = fs.readFileSync(__filename, 'utf8');
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
