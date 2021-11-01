# Disallow empty files

Meaningless files clutter a codebase.

Disallow any files only containing the following:

- Whitespace
- Comments
- Directives
- Empty statements
- Empty block statements

## Fail

```js

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
{
}
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
;;
const x = 0;
```

```js
{
    const x = 0;
}
```
