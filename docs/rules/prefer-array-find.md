# Prefer `Array#{find,findLast}(…)` over the first or last element from `Array#filter(…)`.

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

[`Array#find()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) and [`Array#findLast()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findLast) breaks the loop as soon as it finds a match and doesn't create a new array.

This rule is fixable unless default values are used in declaration or assignment.

## Fail

```js
const item = array.filter(x => isUnicorn(x))[0];
```

```js
const item = array.filter(x => isUnicorn(x)).shift();
```

```js
const [item] = array.filter(x => isUnicorn(x));
```

```js
[item] = array.filter(x => isUnicorn(x));
```

## Pass

```js
const item = array.find(x => isUnicorn(x));
```

```js
item = array.find(x => isUnicorn(x));
```

```js
const item = array.findLast(x => isUnicorn(x));
```

## Options

Type: `object`

### checkFromLast

Type: `boolean`\
Default: `false`

Pass `checkFromLast: true` to check cases searching from last.

#### Fail

```js
// eslint unicorn/prefer-array-find: ["error", {"checkFromLast": true}]
const item = array.filter(x => isUnicorn(x)).at(-1);
```

```js
// eslint unicorn/prefer-array-find: ["error", {"checkFromLast": true}]
const item = array.filter(x => isUnicorn(x)).pop();
```

#### Pass

```js
// eslint unicorn/prefer-array-find: ["error", {"checkFromLast": true}]
const item = array.findLast(x => isUnicorn(x));
```
