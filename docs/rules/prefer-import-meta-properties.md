# prefer-import-meta-properties

📝 Prefer `import.meta.{dirname,filename}` over legacy techniques for getting file paths.

🚫 Disabled by default.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Node.js 20.11 introduced [`import.meta.dirname`](https://nodejs.org/api/esm.html#importmetadirname) and [`import.meta.filename`](https://nodejs.org/api/esm.html#importmetafilename) for ES modules loaded from a `file:` URL. Enable this rule for those modules.

`import.meta.filename` is equivalent to `fileURLToPath(import.meta.url)`, and `import.meta.dirname` is equivalent to `path.dirname(import.meta.filename)`.

The rule allows `fileURLToPath(new URL('.', import.meta.url))` and the equivalent `'./'` form because both return paths with a trailing separator. If path normalization is acceptable, `path.join(import.meta.dirname, './')` also returns a path with the native trailing separator.

## Examples

```js
import {fileURLToPath} from 'node:url';

// ❌
const filename = fileURLToPath(import.meta.url);

// ✅
const filename = import.meta.filename;
```

```js
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// ❌
const dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅
const dirname = import.meta.dirname;
```
