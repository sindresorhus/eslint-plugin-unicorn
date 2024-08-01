# Prefer `Map#has` over `Map#get`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Use `Map#has` instead of `Map#get` to check for the presence of a key in a Map. `Map#has` is more semantically correct for existence checks and avoids unnecessary retrieval of values.

## Fail

```js
if (map.get(foo));
if (map.get(foo) || otherCondition);
if (condition) else if (map.get(foo)) {};
map.get(foo) ? 1 : 2;

Boolean(map.get(foo));
new Boolean(map.get(foo));

!map.get(foo);
!!map.get(foo);

while (map.get(foo)) {}

do {} while (map.get(foo));

do {} while (map.get(foo) || otherCondition);

for (;map.get(foo);) {}

function foo(isBoolean = !!map.get("key")) { }
```

## Pass

```js
if (map.has(foo));
if (map.has(foo) || otherCondition);
if (condition) else if (map.has(foo)) {};
map.has(foo) ? 1 : 2;

map.has(foo);

while (map.has(foo)) {}

do {} while (map.has(foo));

do {} while (map.has(foo) || otherCondition);

for (;map.has(foo);) {}

function foo(isBoolean = map.has("key")) { }
```
