# Enforce the use of regex shorthands to improve readability


## Fail

```js
const regex = /[0-9]/;
const regex = /[^0-9]/;
const regex = /[a-zA-Z0-9_]/;
const regex = /[a-z0-9_]/i;
const regex = /[^a-zA-Z0-9_]/;
const regex = /[^a-z0-9_]/i;
const regex = /[0-9]\.[a-zA-Z0-9_]\-[^0-9]/i;
```


## Pass

```js
const regex = /\d/;
const regex = /\D/;
const regex = /\w/;
const regex = /\w/i;
const regex = /\W/;
const regex = /\W/i;
const regex = /\d\.\w\-\D/i;
```


## Options

You can set the option like this:

```js
"unicorn/regex-shorthand": ["error", [
  'charClassToMeta', // [0-9] -> [\d]
  'charClassToSingleChar' // [\d] -> \d
]]
```

[available values](https://github.com/DmitrySoshnikov/regexp-tree/tree/master/src/optimizer): any transform name (from package regexp-tree).
