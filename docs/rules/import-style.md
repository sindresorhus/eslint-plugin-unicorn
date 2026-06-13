# import-style

📝 Enforce specific import styles per module.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Sometimes a module contains unrelated functions, like `util`, thus it is a good practice to enforce destructuring or named imports here. Other times, in modules like `path`, it is good to use default import as they have similar functions, all likely to be utilized.

This rule applies to modules listed in the `styles` option and Node.js builtin modules when the `nodeBuiltinModules` option is enabled. Other imports are not affected.

This rule defines 4 import styles:

- `unassigned` - `import 'foo'` or `require('foo')`
- `default` - `import path from 'path'` or `const path = require('path')`
- `namespace` - `import * as path from 'path'` or `const path = require('path')`
- `named` - `import {inspect} from 'util'` or `const {inspect} = require('util')`

## Examples

```js
// ❌
const util = require('node:util');

// ✅
const {promisify} = require('node:util');
```

```js
// ❌
import util from 'node:util';

// ❌
import * as util from 'node:util';

// ✅
import {promisify} from 'node:util';
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
'unicorn/import-style': [
	'error',
	{
		styles: {
			util: false,
			path: {
				named: true,
			},
		},
	},
]
```

Do not set all styles to `false` for a module. To disallow a module entirely, use the [`no-restricted-imports`](https://eslint.org/docs/latest/rules/no-restricted-imports) rule instead.

### nodeBuiltinModules

Type: `'default' | 'namespace'`
Default: `undefined`

Enforce a default or namespace import style for Node.js builtin modules imported with the `node:` protocol.

This option only checks static `import` declarations, and only reports default and namespace imports. Named imports are ignored, except `import {default as name} from 'node:…'`, which is treated as a default import. Side-effect imports, `require()`, dynamic `import()`, and export-from statements are ignored.

User-provided entries in `styles` take precedence over this option.

```js
'unicorn/import-style': [
	'error',
	{
		nodeBuiltinModules: 'namespace',
	},
]
```

```js
// ❌
import fs from 'node:fs';

// ✅
import * as fs from 'node:fs';

// ✅
import {readFile} from 'node:fs';
```

```js
'unicorn/import-style': [
	'error',
	{
		nodeBuiltinModules: 'default',
	},
]
```

```js
// ❌
import * as fs from 'node:fs';

// ✅
import fs from 'node:fs';
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
