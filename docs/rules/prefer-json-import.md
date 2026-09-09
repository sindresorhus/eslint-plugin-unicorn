# prefer-json-import

📝 Prefer JSON imports over reading and parsing JSON files.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

[JSON imports](https://nodejs.org/api/esm.html#json-modules) provide a declarative way to load static JSON data.

This rule is opt-in because it cannot determine whether filesystem reads are intentional. Imports change path resolution, loading and error timing, and cache the data. Enable it when JSON files are intended to be static module data.

Checks direct `JSON.parse(readFileSync(…))` and `JSON.parse(await readFile(…))` initializers in top-level ES module variable declarations, including exports. Supports imports and import aliases from `fs` and `fs/promises`, with or without `node:`, and `fs.promises.readFile()`.

Paths must be statically known `.json` strings or `new URL(staticPath, import.meta.url)`. Reads must use default or UTF-8 encoding, with no options beyond `encoding`.

## Examples

```js
import fs from 'node:fs';

// ❌
const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));

// ❌
const settings = JSON.parse(await fs.promises.readFile(new URL('./settings.json', import.meta.url), 'utf8'));

// ✅
import data from './data.json' with {type: 'json'};

// ✅
import settings from './settings.json' with {type: 'json'};

// ✅
const dynamicData = JSON.parse(fs.readFileSync(filename, 'utf8'));

// ✅
function loadFreshData() {
	return JSON.parse(fs.readFileSync('./data.json', 'utf8'));
}
```

## Suggestions

No automatic fix is provided because conversion can change behavior.

Suggestions require a single, non-exported `const` identifier reading a `./` or `../` URL relative to `import.meta.url`. Declarations containing comments, binding type annotations, or outer TypeScript assertions are reported without suggestions.

Plain filesystem paths require manual conversion: relative reads resolve from the working directory, while imports resolve from the importing module.

## Ignored cases

Dynamic paths, indirect or nested reads, callback APIs, revivers, non-UTF-8 encodings, additional read options, and CommonJS files are ignored.
