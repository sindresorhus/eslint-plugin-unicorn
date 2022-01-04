# Prefer `export…from` when re-exporting

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

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

When `true`, if an import is used in other places than just a re-export, all variables in the import declaration will be ignored.

#### Fail

```js
// eslint unicorn/prefer-export-from: ["error", {"ignoreUsedVariables": false}]
import {named1, named2} from './foo.js';

use(named1);

export {named1, named2};
```

#### Pass

```js
// eslint unicorn/prefer-export-from: ["error", {"ignoreUsedVariables": true}]
import {named1, named2} from './foo.js';

use(named1);

export {named1, named2};
```
