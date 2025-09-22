# Disallow unused object properties

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Unused properties, much like unused variables, are often a result of incomplete refactoring and may confuse readers.

This rule is primarily useful when you use objects to group constants or model enumerations. It is much harder to predict class properties usage, and practically impossible to predict reflective property access. This rule ignores cases like that.

## Example use cases

When using [React](https://reactjs.org)'s inline styles or one of [many CSS-in-JS](https://michelebertoli.github.io/css-in-js/) like [glamor](https://github.com/threepointone/glamor), one might find it helpful to group component styles into a constant object. Later you might remove one of the styles, but forget to remove its definition, especially if the component grew in complexity by that time. If these were defined as separate constants, ESLint's builtin `no-unused-vars` rule would have helped, but they are not. That's when the `no-unused-properties` rules becomes useful.

```js
const styles = {
	success: { … },
	danger: { … } // <- Property `danger` is defined but never used
};

export default () => r.div({style: styles.success});
```

This issue extends to most enumeration and const-like use cases. Below is an example straight from [Bootstrap's `scrollspy`](https://github.com/twbs/bootstrap/blob/19f70f9d4ccca132f196011958c1b72462c698e7/js/src/scrollspy.js#L44). The file contains about 300 lines of DOM/jQuery complexity. It's practically impossible to notice the issue manually. But this extra property indicates that authors intended but forgot to handle dropdown menus specially, or at least have a useless constant defined.

```js
const ClassName = {
	DROPDOWN_ITEM: 'dropdown-item',
	DROPDOWN_MENU: 'dropdown-menu', // <- Property `DROPDOWN_MENU` is defined but never used
	ACTIVE: 'active'
};
```

## Examples

```js
// ❌
const myEnum = {
	used: 1,
	unused: 2, // <- Property `unused` is defined but never used.
};

console.log(myEnum.used);

const {used} = myEnum;
```

```js
// ✅
const myEnum = {
	used: 1,
	usedToo: 2,
};

console.log(myEnum); // The whole object is used

console.log(myEnum.used, myEnum.usedToo); // Every property is used individually

myEnum[x] // Unpredictable, all properties are considered to be used

// Objects with methods are skipped too, all properties are considered used
const foo = {
	used: 1,
	method() {
		return this;
	}
};
```

## Scope and limitations

This rule tries hard not to report potentially used properties as unused. Basically, all supported use cases are enum-like as shown above, more complex cases are ignored. Detailed list of limitations follows.

- Does not predict dynamic property access. That is, `object[keys]` says that all properties of an object are potentially used. This is as unpredictable for this rule as `eval(...)` is for the `no-unused-vars` rule.
- Same goes for computed property keys in object definitions, like `{[key]: value}`.
- If a variable is unused, it is not checked. This is done to play nicely with the `no-unused-vars` rule, which everybody should have enabled at all times.
- Does not check objects used as an argument. If you call `f(object)`, it behaves like you used all of its properties, since it's hard to predict what a function would do with the object.
- If you call a method on an object, it is ignored. Because of `this`, it's basically the same as calling a function on an object.
- If you assign to an object, it is ignored. Even if the key you assign to is static.
- Classes are not checked.
- Prototypes are not checked. Only own properties are.
- Does not follow objects across files. If you export an object, it's like if you used all of its properties.

If you want to lift some of these limitations, you should try tools like [Flow](https://flow.org) or [TypeScript](https://www.typescriptlang.org).
