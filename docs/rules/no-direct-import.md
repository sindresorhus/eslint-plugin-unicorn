# Do not import modules directly

Do not import the core Node.js modules directly.

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
