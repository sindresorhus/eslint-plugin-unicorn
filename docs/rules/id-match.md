# require identifiers to match a specified regular expression

Note: This rule is equivalent to [`id-match`](https://eslint.org/docs/rules/id-match), except for addition of `ignoreNamedImports`.

This rule requires identifiers in assignments and `function` definitions to match a specified regular expression.

## Options

This rule has a string option for the specified regular expression.

For example, to enforce a camelcase naming convention:

```json
{
    "unicorn/id-match": ["error", "^[a-z]+([A-Z][a-z]+)*$"]
}
```

Examples of **incorrect** code for this rule with the `"^[a-z]+([A-Z][a-z]+)*$"` option:

```js
/*eslint unicorn/id-match: ["error", "^[a-z]+([A-Z][a-z]+)*$"]*/

var my_favorite_color = "#112C85";
var _myFavoriteColor  = "#112C85";
var myFavoriteColor_  = "#112C85";
var MY_FAVORITE_COLOR = "#112C85";
function do_something() {
    // ...
}

obj.do_something = function() {
    // ...
};

class My_Class {}

class myClass {
    do_something() {}
}

class myClass {
    #do_something() {}
}
```

Examples of **correct** code for this rule with the `"^[a-z]+([A-Z][a-z]+)*$"` option:

```js
/*eslint unicorn/id-match: ["error", "^[a-z]+([A-Z][a-z]+)*$"]*/

var myFavoriteColor   = "#112C85";
var foo = bar.baz_boom;
var foo = { qux: bar.baz_boom };
do_something();
var obj = {
    my_pref: 1
};

class myClass {}

class myClass {
    doSomething() {}
}

class myClass {
    #doSomething() {}
}
```

This rule has an object option:

* `"properties": false` (default) does not check object properties
* `"properties": true` requires object literal properties and member expression assignment properties to match the specified regular expression
* `"classFields": false` (default) does not class field names
* `"classFields": true` requires class field names to match the specified regular expression
* `"onlyDeclarations": false` (default) requires all variable names to match the specified regular expression
* `"onlyDeclarations": true` requires only `var`, `function`, and `class` declarations to match the specified regular expression
* `"ignoreDestructuring": false` (default) enforces `id-match` for destructured identifiers
* `"ignoreDestructuring": true` does not check destructured identifiers
* `"ignoreNamedImports": false` (default) enforces `id-match` for named imports
* `"ignoreNamedImports": true` does not check named imports

### properties

Examples of **incorrect** code for this rule with the `"^[a-z]+([A-Z][a-z]+)*$", { "properties": true }` options:

```js
/*eslint unicorn/id-match: ["error", "^[a-z]+([A-Z][a-z]+)*$", { "properties": true }]*/

var obj = {
    my_pref: 1
};
```

### classFields

Examples of **incorrect** code for this rule with the `"^[a-z]+([A-Z][a-z]+)*$", { "classFields": true }` options:

```js
/*eslint unicorn/id-match: ["error", "^[a-z]+([A-Z][a-z]+)*$", { "properties": true }]*/

class myClass {
    my_pref = 1;
}

class myClass {
    #my_pref = 1;
}
```

### onlyDeclarations

Examples of **correct** code for this rule with the `"^[a-z]+([A-Z][a-z]+)*$", { "onlyDeclarations": true }` options:

```js
/*eslint unicorn/id-match: [2, "^[a-z]+([A-Z][a-z]+)*$", { "onlyDeclarations": true }]*/

do_something(__dirname);
```

### ignoreDestructuring: false

Examples of **incorrect** code for this rule with the default `"^[^_]+$", { "ignoreDestructuring": false }` option:

```js
/*eslint unicorn/id-match: [2, "^[^_]+$", { "ignoreDestructuring": false }]*/

let { category_id } = query;

let { category_id = 1 } = query;

let { category_id: category_id } = query;

let { category_id: category_alias } = query;

let { category_id: categoryId, ...other_props } = query;
```

### ignoreDestructuring: true

Examples of **incorrect** code for this rule with the `"^[^_]+$", { "ignoreDestructuring": true }` option:

```js
/*eslint unicorn/id-match: [2, "^[^_]+$", { "ignoreDestructuring": true }]*/

let { category_id: category_alias } = query;

let { category_id, ...other_props } = query;
```

Examples of **correct** code for this rule with the `"^[^_]+$", { "ignoreDestructuring": true }` option:

```js
/*eslint unicorn/id-match: [2, "^[^_]+$", { "ignoreDestructuring": true }]*/

let { category_id } = query;

let { category_id = 1 } = query;

let { category_id: category_id } = query;
```

### ignoreNamedImports: false

Examples of **incorrect** code for this rule with the default `"^[^_]+$", { "ignoreNamedImports": false }` option:

```js
/*eslint unicorn/id-match: [2, "^[^_]+$", { "ignoreNamedImports": false }]*/

import { category_id } from 'test';
```

Examples of **correct** code for this rule with the `"^[^_]+$", { "ignoreNamedImports": true }` option:

```js
/*eslint unicorn/id-match: [2, "^[^_]+$", { "ignoreNamedImports": true }]*/

import { categoryId } from 'test';
```

### ignoreNamedImports: true

Examples of **correct** code for this rule with the `"^[^_]+$", { "ignoreNamedImports": true }` option:

```js
/*eslint unicorn/id-match: [2, "^[^_]+$", { "ignoreNamedImports": true }]*/

import { category_id } from 'test';
```

## When Not To Use It

If you don't want to enforce any particular naming convention for all identifiers, or your naming convention is too complex to be enforced by configuring this rule, then you should not enable this rule.
