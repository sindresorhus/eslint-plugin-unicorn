# Enforce importing index files with `.`

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

Enforces importing index file with `.` instead of `./`, `./index` or `./index.js`.

## Fail

```js
const m = require('./');
```

```js
const m = require('../');
```

```js
const m = require('./index');
```

```js
const m = require('./index.js');
```

```js
const m = require('./foo/index.js');
```

```js
const m = require('@foo/bar/index');
```

```js
import m from './';
```

```js
import m from './index';
```

## Pass

```js
const m = require('.');
```

```js
const m = require('..');
```

```js
const m = require('./foo');
```

```js
const m = require('@foo/bar');
```

```js
import m from '.';
```

## Options

### ignoreImports

Type: `boolean`\
Default: `false`

Don't check `import` statements.

Can be useful if you're using native `import` in Node.js where the filename and extension is required.

```js
// eslint unicorn/import-index: ["error", {"ignoreImports": true}]
import m from './index'; // Passes
```

```js
// eslint unicorn/import-index: ["error", {"ignoreImports": false}]
import m from './index'; // Fails
```
