# Prefer `for…of` over `Array#forEach(…)`

<!-- Do not manually modify RULE_NOTICE part. Run: `npm run generate-rule-notices` -->
<!-- RULE_NOTICE -->
✅ *This rule is part of the [recommended](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) config.*

🔧💡 *This rule is [auto-fixable](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems) and provides [suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).*
<!-- /RULE_NOTICE -->

Benefits of [`for…of` statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of) over [`Array#forEach(…)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach) can include:

- Faster
- Better readability
- Ability to exit early with `break` or `return`

## Fail

```js
array.forEach(element => {
	bar(element);
});
```

```js
array?.forEach(element => {
	bar(element);
});
```

```js
array.forEach((element, index) => {
	bar(element, index);
});
```

```js
array.forEach((element, index, array) => {
	bar(element, index, array);
});
```

## Pass

```js
for (const element of array) {
	bar(element);
}
```

```js
for (const [index, element] of array.entries()) {
	bar(element, index);
}
```

```js
for (const [index, element] of array.entries()) {
	bar(element, index, array);
}
```
