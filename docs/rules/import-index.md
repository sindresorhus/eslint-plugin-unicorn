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


## Pass

```js
const m = require('.');
```

```js
const m = require('..');
```
