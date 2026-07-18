# consistent-class-member-order

📝 Enforce consistent class member order.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

A predictable member order makes classes faster to scan and keeps related static, instance, field, and method members together.

This rule enforces the following class member order:

1. Static fields
2. Static blocks
3. Static methods
4. Private instance fields
5. Public instance fields
6. Constructors
7. Private instance methods
8. Public instance methods

Static members are grouped by `static` before privacy, so `static #foo` belongs with other static fields or methods.

TypeScript `protected` members follow the same order as public members.

This rule does not autofix because fields and static blocks run in declaration order, and method order is observable through property reflection.

It may offer a manual suggestion for simple class bodies without comments, decorators, computed keys, or unsupported members.

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
	'static-method',
	'private-field',
	'public-field',
	'constructor',
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
