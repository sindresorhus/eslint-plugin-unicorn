# Prefer using the `node:` protocol when importing Node.js builtin modules

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 The `--fix` option on the [command line](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) can automatically fix some of the problems reported by this rule.

When importing builtin modules, it's better to use the [`node:` protocol](https://nodejs.org/api/esm.html#esm_node_imports) as it makes it perfectly clear that the package is a Node.js builtin module.

And don't forget to [upvote this issue](https://github.com/nodejs/node/issues/38343) if you agree.

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

## Options

Type: `object`

### `checkRequire`

Type: `boolean`\
Default: `false`

Currently, `require(…)` with the `node:` protocol is only available on Node.js 16. If you don't care about old versions, you can set this to `true`.

We'll remove this option and check `require(…)` by default once this feature get backported to v12.

```js
// eslint unicorn/prefer-node-protocol: ["error", {"checkRequire": true}]
const fs = require('fs'); // Fails
```
