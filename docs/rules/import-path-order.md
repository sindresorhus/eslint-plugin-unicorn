# Organize imports by path order

Imports and requires should be organized together and sorted by relative path depth.

The scope of this rule is deliberately simple. Both [sort-imports](https://eslint.org/docs/rules/sort-imports) and [import/order](https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/order.md) exist for more complicated and configurable patterns.

This rule will:

* Sort import lines by path
* Built-in packages (`fs`, `path`, etc.)are sorted first
* Relative paths (`../foo`) are sorted after absolute paths (`foo`)
* `../../foo` is before `../foo`
* Paths with the same nesting are sorted alphabetically

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

`allowBlankLines` will force all imports to be organized together. It defaults to `false`.

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
