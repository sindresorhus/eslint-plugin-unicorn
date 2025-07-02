# Prefer using the `node:` protocol when importing Node.js builtin modules

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When getting builtin modules, it's better to use the [`node:` protocol](https://nodejs.org/api/esm.html#node-imports) as it makes it perfectly clear that the package is a Node.js builtin module.

## Examples

```js
// ❌
import dgram from 'dgram';

// ✅
import dgram from 'node:dgram';
```

```js
// ❌
export {strict as default} from 'assert';

// ✅
export {strict as default} from 'node:assert';
```

```js
// ❌
import fs from 'fs/promises';

// ✅
import fs from 'node:fs/promises';
```

```js
// ❌
const fs = require('fs/promises');

// ✅
const fs = require('node:fs/promises');
```

```js
// ❌
const fs = process.getBuiltinModule('fs/promises');

// ✅
const fs = process.getBuiltinModule('node:fs/promises');
```
