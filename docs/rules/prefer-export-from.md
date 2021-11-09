# Prefer `export…from` when re-exporting

✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).*

When re-exporting from a module, it's unnecessary to import and then export. It can be done in a single `export…from` declaration.

## Fail

```js
import defaultExport from './foo.js';
export default defaultExport;
```

```js
import {named} from './foo.js';
export {named};
```

```js
import * as namespace from './foo.js';
export {namespace};
```

```js
import defaultExport, {named} from './foo.js';
export default defaultExport;
export {
	defaultExport as renamedDefault,
	named,
	named as renamedNamed,
};
```

## Pass

```js
export {default} from './foo.js';
```

```js
export {named} from './foo.js';
```

```js
export * as namespace from './foo.js';
```

```js
export {
	default,
	default as renamedDefault,
	named,
	named as renamedNamed,
} from './foo.js';
```

```js
// There is no substitution
import * as namespace from './foo.js';
export default namespace;
```

## Options

### ignoreUsedVariables

Type: `boolean`\
Default: `false`

When pass `"ignoreUsedVariables": true`, if any variable is used more than just re-export or not exported, all variables in the import declaration will be ignored.

#### Fail

```js
// eslint unicorn/import-index: ["error", {"ignoreUsedVariables": false}]
import {named1, named2} from './foo.js';

use(named1);

export {named1, named2};
```

#### Pass

```js
// eslint unicorn/import-index: ["error", {"ignoreUsedVariables": true}]
import {named1, named2} from './foo.js';

use(named1);

export {named1, named2};
```

```js
// eslint unicorn/import-index: ["error", {"ignoreUsedVariables": true}]
import {named1, named2} from './foo.js';

export {named1};
```
