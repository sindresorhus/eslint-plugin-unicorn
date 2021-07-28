# Prefer `export…from` syntax when re-exporting

When re-exporting from module, it's unnecessary to import and then export, it can be done in one `export…from` declaration.

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
import defaultExport, {named} from './foo.js';
export {
	defaultExport as default,
	defaultExport as renamedDefault,
	named,
	named as renamedNamed,
};
```

```js
import * as namespace from './foo.js';
export {namespace};
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
// There is no substitute
import * as namespace from './foo.js';
export default namespace;
```

```js
export {
	default,
	default as renamedDefault,
	named,
	named as renamedNamed,
} from './foo.js';
```
