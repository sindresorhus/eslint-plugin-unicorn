# Prefer using the `node:` protocol when importing Node.js builtin modules

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*
<!-- /RULE_NOTICE -->

When importing builtin modules, it's better to use the [`node:` protocol](https://nodejs.org/api/esm.html#node-imports) as it makes it perfectly clear that the package is a Node.js builtin module.

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

```js
const fs = require('fs/promises');
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

```js
const fs = require('node:fs/promises');
```
