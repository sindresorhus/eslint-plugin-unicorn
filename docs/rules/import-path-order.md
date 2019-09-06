# Organize imports by path order

Imports and requires should be organized together and sorted by relative path depth.

The scope of this rule is deliberately simple. Both the [`sort-imports` rule](https://eslint.org/docs/rules/sort-imports) and the [`import/order` rule](https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/order.md) exist for more complicated and configurable patterns.

This rule will:

- Sort import lines by path
- Built-in modules (`fs`, `path`, etc.) are sorted first
- Relative paths (`../foo`) are sorted after absolute paths (`foo`)
- `../../foo` is before `../foo`
- Paths with the same nesting are sorted alphabetically

## Fail

```js
const b = require('b');
const a = require('a');
```

```js
import b from 'b';
import a from 'a';
```

```js
import x from 'c';
import y from 'b';
import z from 'a';
```

```js
import b from 'b';
import 'a';
```

```js
import a from './a';
import b from 'b';
```

```js
import a from './a';
import b from '../b';
```

```js
import a from '../a';
import b from '../../b';
```

```js
// Built-in packages should come first
import a from 'a';
import fs from 'fs';
```

## Pass

```js
const a = require('a');
const b = require('b');
```

```js
import a from 'a';
import b from 'b';
```

```js
import z from 'a';
import y from 'b';
import x from 'c';
```

```js
import 'a';
import b from 'b';
```

```js
import b from 'b';
import a from './a';
```

```js
import b from '../b';
import a from './a';
```

```js
import b from '../../b';
import a from '../a';
```

```js
// Built-in packages should come first
import fs from 'fs';
import a from 'a';
```

## Options

### `allowBlankLines`

Type: `boolean`<br>
Default: `false`

Allow blank lines between import statements.

#### Fail

```js
/* eslint unicorn/import-path-order: ["error", {allowBlankLines: false}] */
import b from 'b';

import a from 'a';
```

#### Pass

```js
/* eslint unicorn/import-path-order: ["error", {allowBlankLines: true}] */
import a from 'a';

import b from 'b';
```

```js
/* eslint unicorn/import-path-order: ["error", {allowBlankLines: false}] */
import a from 'a';
// Comments are okay
import b from 'b';
```

```js
/* eslint unicorn/import-path-order: ["error", {allowBlankLines: false}] */
import a from 'a';
const foo = a.foo; // Non-import statements will fail
import b from 'b';
```

### `comparator`

Type: `string`

This adds additional ordering constraints for imports that have the same relative source.

Options are:
- `case-sensitive` - Orders alphabetically, case-sensitive
- `case-insensitive` - Orders alphabetically, case-insensitive
- `parts` - Groups imports with similar parts next to each other *(default)*
- `off` - No additional ordering

#### Fail

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'case-sensitive'}] */
import a from 'a';
import B from 'B';
```

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'case-insensitive'}] */
import B from 'B';
import a from 'a';
```

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'parts'}] */
import a from 'a-one';
import b from 'b-three';
import a from 'a-two';
```

#### Pass

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'case-sensitive'}] */
import B from 'B';
import a from 'a';
```

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'case-insensitive'}] */
import a from 'a';
import B from 'B';
```

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'parts'}] */
import a from 'a-one';
import a from 'a-two';
import b from 'b-three';
```

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'off'}] */
import c from 'a-c';
import b from 'b';
import a from 'a';
```

### `partsRegex`

Type: `string[]`<br>
Default: `['-', '/']`

This controls how `comparator: 'parts'` behaves. It's an array of each *type* of path comparator to use.

#### Fail

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'parts', partsRegex: ["-"]}] */
import one from 'a-one';
import three from 'b-three';
import two from 'a-two';
```

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'parts', partsRegex: ["/"]}] */
import one from 'a/one';
import three from 'b/three';
import two from 'a/two';
```

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'parts', partsRegex: ["-","/"]}] */
import one from 'a-one';
import three from 'a/three';
import two from 'a-two';
import four from 'a/four';
```

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'parts', partsRegex: ["x"]}] */
import one from 'axone';
import three from 'bxthree';
import two from 'axtwo';
```

#### Pass

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'parts', partsRegex: ["-"]}] */
import one from 'a-one';
import two from 'a-two';
import three from 'b-three';
```

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'parts', partsRegex: ["/"]}] */
import one from 'a/one';
import two from 'a/two';
import three from 'b/three';
```

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'parts', partsRegex: ["-","/"]}] */
import one from 'a-one';
import two from 'a-two';
import three from 'a/three';
import four from 'a/four';
```

```js
/* eslint unicorn/import-path-order: ["error", {comparator: 'parts', partsRegex: ["x"]}] */
import one from 'axone';
import two from 'axtwo';
import three from 'bxthree';
```
