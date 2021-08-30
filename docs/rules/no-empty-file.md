# Disallow empty files.

Meaningless files clutter a codebase. Disallow any file containing absolutely nothing, only whitespace, only comments, only a `'use strict';` statement, or empty statements.

This rule is not fixable.

## Fail

```js

```

```
\n
```

```
\r
```

```
\r\n
```

```js
// comment
```

```js
/* comment */
```

```js
'use strict';
```

```js
;
```

```js
{}
```

## Pass

```js
const x = 0;
```

```js
'use strict';
const x = 0;
```

```js
;; const x = 0;
```

```js
{
    ;
    'use strict';
    const x = 0;
}
```
