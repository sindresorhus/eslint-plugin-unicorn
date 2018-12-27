# Disallow unused object properties

Unused properties, much like unused variables, are often a result of incomplete refactoring and may confuse readers.

This rule is primarily useful when you use objects to group constants or model enumerations. It is much harder to predict class properties usage, and practically impossible to predict reflective property access. Cases like that are ignored by this rule.

## Fail

```js
const enum = {
	used: 1,
	unused: 2 // Property `unused` is defined but never used.
};

console.log(enum.used);

const {used} = enum;
```


## Pass

```js
const enum = {
	used: 1,
	usedToo: 2
};

console.log(enum); // The whole object is used

console.log(enum.used, enum.usedToo); // Every property is used individually

enum[x] // Unpredictable, all properties considered to be used

// Objects with methods are skipped too, all properties considered used.
const foo = {
	used: 1,
	method() {
		return this;
	}
};
```
