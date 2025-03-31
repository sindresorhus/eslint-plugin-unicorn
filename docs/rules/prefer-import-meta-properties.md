# Prefer `import.meta.{dirname,filename}` over legacy techniques for getting file paths

🚫 This rule is _disabled_ in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Starting with Node.js 20.11, [`import.meta.dirname`](https://nodejs.org/api/esm.html#importmetadirname) and [`import.meta.filename`](https://nodejs.org/api/esm.html#importmetafilename) have been introduced in ES modules.

> `import.meta.filename` is the same as the `url.fileURLToPath()` of the `import.meta.url`.\
> `import.meta.dirname` is the same as the `path.dirname()` of the `import.meta.filename`.

This rule replaces those codes written in the legacy way with `import.meta.{dirname,filename}`.

<!-- Remove this comment, add more detailed description. -->

## Examples

```js
import path from "node:path";
import { fileURLToPath } from "node:url";

// ❌
const filename = fileURLToPath(import.meta.url);

// ✅
const filename = import.meta.filename;
```

```js
import path from "node:path";
import { fileURLToPath } from "node:url";

// ❌
const dirname = path.dirname(fileURLToPath(import.meta.url));
const dirname = path.dirname(import.meta.filename);
const dirname = fileURLToPath(new URL(".", import.meta.url));

// ✅
const dirname = import.meta.dirname;
```
