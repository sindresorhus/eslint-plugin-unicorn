# consistent-class-member-order

📝 Enforce consistent class member order.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->

This rule enforces the following class member order:

1. Static fields
2. Static blocks
3. Private instance fields
4. Public instance fields
5. Constructors
6. Static methods
7. Private instance methods
8. Public instance methods

Static members are grouped by `static` before privacy, so `static #foo` belongs with other static fields or methods.

TypeScript `protected` members follow the same order as public members.

This rule does not autofix. Reordering class fields and static blocks can change runtime behavior because they run in declaration order.

This rule is intentionally simple. It only enforces group order and will not add options for sorting within groups, newline handling, or more detailed member categories. Use a dedicated sorting rule if you need that.

## Options

Type: `object`

### order

Type: `string[]`

Default:

```js
[
	'static-field',
	'static-block',
	'private-field',
	'public-field',
	'constructor',
	'static-method',
	'private-method',
	'public-method',
]
```

The array must contain each group exactly once.

## Examples

```js
// ❌
class Foo {
	constructor() {}
	#privateField = 1;
	publicField = 1;
}
```

```js
// ✅
class Foo {
	static staticField = 1;
	#privateField = 1;
	publicField = 1;

	constructor() {}
}
```

```js
// ❌
class Foo {
	publicMethod() {}
	#privateMethod() {}
}
```

```js
// ✅
class Foo {
	static staticMethod() {}
	#privateMethod() {}
	publicMethod() {}
}
```
