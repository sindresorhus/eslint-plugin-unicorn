# Prefer using the `node:` protocol when importing Node.js builtin modules

When importing builtin modules, it's better to use the [`node:` protocol](https://nodejs.org/api/esm.html#esm_node_imports) as it makes it perfectly clear that the package is a Node.js builtin module.

And don't forget to [upvote this issue](https://github.com/nodejs/node/issues/38343) if you agree.

This rule is fixable.

## Fail

```js
import dgram from 'dgram';
```

```js
export {strict as default} from 'assert';
```

```js
import fs from 'fs/promises';
```

## Pass

```js
import dgram from 'node:dgram';
```

```js
export {strict as default} from 'node:assert';
```

```js
import fs from 'node:fs/promises';
```

```js
const fs = require('fs');
```

```js
import _ from 'lodash';
```

```js
import fs from './fs.js';
```
