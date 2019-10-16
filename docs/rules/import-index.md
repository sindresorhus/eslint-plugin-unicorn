# Enforce importing index files with `.`

Enforces importing index file with `.` instead of `./`, `./index` or `./index.js`.

This rule is fixable.


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


### `ignoreImports`

The default behavior is to check for imports. If you want to disable this (for example, you are moving to nodejs esm), set `ignoreImports` to `true`:

```js
// eslint unicorn/import-index: ["error", {"ignoreImports": true}]
import m from './index'; // pass

// eslint unicorn/import-index: ["error", {"ignoreImports": false}]
import m from './index'; // fails
```
