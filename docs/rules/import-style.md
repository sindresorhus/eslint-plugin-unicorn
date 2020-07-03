# Enforce specific import styles per module

Sometimes a module contains unrelated functions like `util`, thus it is a good practice to enforce destructuring or named imports here, other times in modules like `path` it is good to do default import as they have similar functions, all likely to be utilised.

This rule defines 4 import typoes:
* `unassigned` - `import 'foo'` or `require('foo')`
* `default` - `import path from 'path'` or `const path = require('path')`
* `namespace` - `import * as path from 'path'` or `const path = require('path')`
* `named` - `import {inspect} from 'util'` or `const {inspect} = require('util')`

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
* `util` - `named` only
* `path` - `default` only
* `chalk` - `default` only

The example below:
- disables any restrictions on the `utils` module imports
- allows `named` import (leaving `default` allowed too) from the `path` module (by default only `default` import of `path` is allowed)

```js
"unicorn/import-style": [
	"error",
	{
		"styles": {
			"utils": false,
			"path": {
				"named": true
			}
		}
	}
]
```

### extendDefaultStyles

Type: `boolean`<br>
Default: `true`

Pass `"extendDefaultStyles": false` to override the default `styles` option completely.

### checkImport

Type: `boolean`<br>
Default: `true`

Pass `"checkImport": false` to disable linting of static import statements (like `import 'foo'`) completely.

### checkDynamicImport

Type: `boolean`<br>
Default: `true`

Pass `"checkDynamicImport": false` to disable linting of dynamic import statements (like `import('foo')`) completely.

### checkRequire

Type: `boolean`<br>
Default: `true`

Pass `"checkRequire": false` to disable linting of `require` calls completely.
