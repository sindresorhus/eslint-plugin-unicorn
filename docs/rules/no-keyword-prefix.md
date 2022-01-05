# Disallow identifiers starting with `new` or `class`

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
<!-- /RULE_NOTICE -->

`new Foo` and `newFoo` look very similar. Use alternatives that do not look like keyword usage.

## Fail

```js
const newFoo = 'foo';
const classFoo = 'foo';
```

## Pass

```js
const foo = 'foo';
const _newFoo = 'foo';
const new_foo = 'foo';
const fooNew = 'foo';
```

## Options

### `disallowedPrefixes`

If you want a custom list of forbidden prefixes you can set them with `disallowedPrefixes`:

```js
// eslint unicorn/no-keyword-prefix: ["error", {"disallowedPrefixes": ["new", "for"]}]
const classFoo = "a"; // pass

// eslint unicorn/no-keyword-prefix: ["error", {"disallowedPrefixes": ["new", "for"]}]
const forFoo = "a"; // fail
```

The default is `["new", "class"]`.

### `checkProperties`

If you want to disable this rule for properties, set `checkProperties` to `false`:

```js
// eslint unicorn/no-keyword-prefix: ["error", {"checkProperties": true}]
foo.newFoo = 2; // fail

// eslint unicorn/no-keyword-prefix: ["error", {"checkProperties": false}]
var foo = {newFoo: 1}; // pass

// eslint unicorn/no-keyword-prefix: ["error", {"checkProperties": false}]
foo.newFoo = 2; // pass
```

### `onlyCamelCase`

The default behavior is to check for camel case usage. If you want to forbid the prefix entirely, set `onlyCamelCase` to `false`:

```js
// eslint unicorn/no-keyword-prefix: ["error", {"onlyCamelCase": true}]
const new_foo = "foo"; // pass

// eslint unicorn/no-keyword-prefix: ["error", {"onlyCamelCase": false}]
const new_foo = "foo"; // fail
```
