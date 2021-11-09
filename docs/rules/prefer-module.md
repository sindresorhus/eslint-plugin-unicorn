# Prefer JavaScript modules (ESM) over CommonJS

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*

Prefer using the [JavaScript module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) format over the legacy CommonJS module format.

1. Forbids `'use strict'` directive.

	JavaScript modules use “Strict Mode” by default.

1. Forbids “Global Return”.

	This is a CommonJS-only feature.

1. Forbids the global variables `__dirname` and `__filename`.

	They are [not available in JavaScript modules](https://nodejs.org/api/esm.html#esm_no_filename_or_dirname).

	Replacements:

	```js
	import {fileURLToPath} from 'url';
	import path from 'path';

	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	```

	However, in most cases, this is better:

	```js
	import {fileURLToPath} from 'url';

	const foo = fileURLToPath(new URL('foo.js', import.meta.url));
	```

	And many Node.js APIs accept `URL` directly, so you can just do this:

	```js
	const foo = new URL('foo.js', import.meta.url);
	```

1. Forbids `require(…)`.

	`require(…)` can be replaced by `import …` or `import(…)`.

1. Forbids `exports` and `module.exports`.

	`export …` should be used in JavaScript modules.

_`.cjs` files are ignored._

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
