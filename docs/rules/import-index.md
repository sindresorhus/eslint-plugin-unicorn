# Enforce importing index files with `.`

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
