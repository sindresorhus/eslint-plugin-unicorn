# Prefer `for…of` over the `forEach` method

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Benefits of [`for…of` statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of) over the `forEach` method can include:

- Faster
- Better readability
- Ability to exit early with `break` or `return`
- Ability to skip iterations with `continue`

Additionally, using `for…of` has great benefits if you are using TypeScript, because it does not cause a function boundary to be crossed. This means that type-narrowing earlier on in the current scope will work properly while inside of the loop (without having to re-type-narrow). Furthermore, any mutated variables inside of the loop will picked up on for the purposes of determining if a variable is being used.

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

## Options

### allowIndexParameter

Type: `boolean`\
Default: `false`

You can set the `allowIndexParameter` option like this:

```js
"unicorn/no-array-for-each": [
	"error",
	{
		"allowIndexParameter": true
	}
]
```
