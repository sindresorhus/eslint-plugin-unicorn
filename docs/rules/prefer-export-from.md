# prefer-export-from

📝 Prefer `export…from` when re-exporting.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

When re-exporting from a module, it's unnecessary to import and then export. It can be done in a single `export…from` declaration.

## Examples

```js
// ❌
import defaultExport from './foo.js';
export default defaultExport;

// ✅
export {default} from './foo.js';
```

```js
// ❌
import {named} from './foo.js';
export {named};

// ✅
export {named} from './foo.js';
```

```js
// ❌
import * as namespace from './foo.js';
export {namespace};

// ✅
export * as namespace from './foo.js';
```

```js
// ❌
import defaultExport, {named} from './foo.js';
export default defaultExport;
export {
	defaultExport as renamedDefault,
	named,
	named as renamedNamed,
};

// ✅
export {
	default,
	default as renamedDefault,
	named,
	named as renamedNamed,
} from './foo.js';
```

```js
// ✅
// There is no substitution
import * as namespace from './foo.js';
export default namespace;
```

## Options

### ignoreUsedVariables

Type: `boolean`\
Default: `false`

When `true`, if an import is used in other places than just a re-export, all variables in the import declaration will be ignored.

```js
/* eslint unicorn/prefer-export-from: ["error", {"ignoreUsedVariables": false}] */
// ❌
import {named1, named2} from './foo.js';

use(named1);

export {named1, named2};
```

```js
/* eslint unicorn/prefer-export-from: ["error", {"ignoreUsedVariables": true}] */
// ✅
import {named1, named2} from './foo.js';

use(named1);

export {named1, named2};
```
