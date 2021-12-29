# Enforce specific import styles per module

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

Sometimes a module contains unrelated functions, like `util`, thus it is a good practice to enforce destructuring or named imports here. Other times, in modules like `path`, it is good to use default import as they have similar functions, all likely to be utilized.

This rule defines 4 import styles:

- `unassigned` - `import 'foo'` or `require('foo')`
- `default` - `import path from 'path'` or `const path = require('path')`
- `namespace` - `import * as path from 'path'` or `const path = require('path')`
- `named` - `import {inspect} from 'util'` or `const {inspect} = require('util')`

## Fail

```js
const util = require('util');

import util from 'util';

import * as util from 'util';
```

## Pass

```js
const {promisify} = require('util');

import {promisify} from 'util';
```

## Options

### styles

Type: `object`

You can extend default import styles per module by passing the `styles` option.

Default options per module are:

- `util` - `named` only
- `path` - `default` only
- `chalk` - `default` only

The example below:

- Disables any restrictions on the `util` module imports.
- Allows `named` import (leaving `default` allowed too) from the `path` module (by default only `default` import of `path` is allowed).

```js
"unicorn/import-style": [
	"error",
	{
		"styles": {
			"util": false,
			"path": {
				"named": true
			}
		}
	}
]
```

### extendDefaultStyles

Type: `boolean`\
Default: `true`

Pass `"extendDefaultStyles": false` to override the default `styles` option completely.

### checkImport

Type: `boolean`\
Default: `true`

Pass `"checkImport": false` to disable linting of static import statements (like `import ... from 'foo'` or `import 'foo'`) completely.

### checkDynamicImport

Type: `boolean`\
Default: `true`

Pass `"checkDynamicImport": false` to disable linting of dynamic import statements (like `await import('foo')`) completely.

### checkExportFrom

Type: `boolean`\
Default: `false`

Pass `"checkExportFrom": true` to enable linting of export-from statements (like `export ... from 'foo'`).

### checkRequire

Type: `boolean`\
Default: `true`

Pass `"checkRequire": false` to disable linting of `require` calls completely.
