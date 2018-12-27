# Disallow unused object properties

Unused properties, much like unused variables, are often a result of incomplete refactoring and may confuse readers.

This rule is primarily useful when you use objects to group constants or model enumerations. It is much harder to predict class properties usage, and practically impossible to predict reflective property access. Cases like that are ignored by this rule.

## Example use cases

With when using [React](https://reactjs.org)'s inline styles or one of [many CSS-in-JS](http://michelebertoli.github.io/css-in-js/) like [glamor](https://github.com/threepointone/glamor) one might find it helpful to group component styles into a constant object. Later you might remove one of the styles, but forget to remove it's definition (especially if the component grew in complexity by that time). If these were defined as separate constants, eslint's builtin `no-unused-vars` rule would've helped, but they are not. That's where `no-unused-properties` comes into play.

```js
const styles = {
	success: { ... },
	danger: { ... } // <- Property `danger` is defined but never used
};

export default () => r.div({ style: styles.success })
```

This issue really extends to most enumeration and const-like use cases. Below is an example straight from [Bootstrap's scrollspy](https://github.com/twbs/bootstrap/blob/19f70f9d4ccca132f196011958c1b72462c698e7/js/src/scrollspy.js#L44). The file contains about 300 lines of DOM/jQuery complexity, practically impossible to notice the issue manually. But this extra property indicates that authors intended but forgot to handle dropdown menus in a special way, or at least have a useless constant defined.

```js
const ClassName = {
	DROPDOWN_ITEM : 'dropdown-item',
	DROPDOWN_MENU : 'dropdown-menu', // <- Property `DROPDOWN_MENU` is defined but never used
	ACTIVE        : 'active'
}
```

## Fail

```js
const enum = {
	used: 1,
	unused: 2 // <- Property `unused` is defined but never used.
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

## Scope and limitations

This rule tries hard not to report potentially used properties as unused. Basically all supported use cases are enum-like as shown above, more complex cases are ignored. Detailed list of limitations follows.

- Does not predict dynamic property access. That is `object[keys]` says that all properties of an object are potentially used. This is as unpredictible for this rule as `eval(...)` is for `no-unused-vars`.
- Same goes for computed property keys in object definitions (like `{[key]: value}`)
- If a varible is unused, it is not checked. This is done to play nicely with enabled `no-unused-vars`, which everybody should have enabled at all times.
- Does not check objects used as an argument. If you call `f(object)`, it behaves like you used all of it's properties, since it's hard to predict what a function would do with the object.
- If you call a method on an object, it is ignored. Because of `this`, it's basically the same as calling a function on an object.
- If you assign to an object, it is ignored. Even if the key you assign to is static.
- Classes are not checked.
- Prototypes are not checked, only own properties are.
- Does not follow objects across files. If you export an object, it's like if you used all of it's properties.

If you really want to lift some of the limitations, you should try tools like [Flow](https://flow.org/) or [TypeScript](https://www.typescriptlang.org/).
