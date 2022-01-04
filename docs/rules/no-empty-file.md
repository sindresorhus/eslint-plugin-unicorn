# Disallow empty files

<!-- Do not manually modify RULE_NOTICE part -->
<!-- RULE_NOTICE_START -->
<!-- RULE_NOTICE_END -->

Meaningless files clutter a codebase.

Disallow any files only containing the following:

- Whitespace
- Comments
- Directives
- Empty statements
- Empty block statements
- Hashbang

## Fail

```js

```

```js
// Comment
```

```js
/* Comment */
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

```js
#!/usr/bin/env node
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
