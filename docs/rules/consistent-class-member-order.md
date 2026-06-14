# consistent-class-member-order

📝 Enforce consistent class member order.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->

This rule enforces the following class member order:

1. Private instance fields
2. Public instance fields
3. Static fields
4. Constructors
5. Private instance methods
6. Public instance methods
7. Static methods
8. Static blocks

Static members are grouped by `static` before privacy, so `static #foo` belongs with other static fields or methods.

TypeScript `protected` members follow the same order as public members.

This rule does not autofix. Reordering class fields and static blocks can change runtime behavior because they run in declaration order.

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
	#privateMethod() {}
	publicMethod() {}
}
```
