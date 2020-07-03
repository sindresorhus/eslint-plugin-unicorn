# Whether to allow default imports or destructuring/named imports

Sometimes a module contains unrelated functions like `util`, thus it is a good practice to enforce destructuring or named imports here, other times in modules like `path` it is good to do default import as they have similar functions, likely to be utilised. By default `path` and `chalk` are enforced to have default export and `util`, `lodash` and `underscore` are having named export. But you can easily override these properties by passing `false` for respective module.

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
