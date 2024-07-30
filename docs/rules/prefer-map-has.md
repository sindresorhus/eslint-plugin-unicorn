# Prefer `Map#has` over `Map#get`

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

In some places where Boolean value judgment is required, it is more reasonable to prefer `Map#has` over `Math#get`.

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

while (map.get(foo)) {
  // do staff
}

do {} while (map.get(foo));

do {} while (map.get(foo) || otherCondition);
```

## Pass

```js
if (map.has(foo));
if (map.has(foo) || otherCondition);
if (condition) else if (map.has(foo)) {};
map.has(foo) ? 1 : 2;

map.has(foo);

while (map.has(foo)) {
  // do staff
}

do {} while (map.has(foo));

do {} while (map.has(foo) || otherCondition);
```
