# Prefer `export…from` when re-exporting

When re-exporting from a module, it's unnecessary to import and then export. It can be done in a single `export…from` declaration.

This rule is fixable.

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
