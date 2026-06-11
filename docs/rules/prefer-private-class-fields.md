# prefer-private-class-fields

📝 Prefer private class fields over the underscore-prefix convention.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Before [private class fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements) existed, a leading underscore was the common convention for marking a class member as "private". That convention is purely cosmetic, the member is still publicly accessible. Private class fields are enforced by the language, so prefer them.

The autofix only runs when every reference is a `this.` access inside the declaring class, since a private field can only be accessed that way. When a member is also accessed in a way that has no private-field equivalent (external access, computed access like `this['_foo']`, destructuring, or `super._foo`), the rule reports it without a fix.

## Examples

```js
// ❌
class Foo {
	static _PRIVATE_STATIC_FIELD;
	_privateField;

	_privateMethod() {
		return 'hello world';
	}
}

// ✅
class Foo {
	static #PRIVATE_STATIC_FIELD;
	#privateField;

	#privateMethod() {
		return 'hello world';
	}
}
```

> [!NOTE]
> Private class fields are observably different from underscore-prefixed properties: they are not enumerable, so `Object.keys()`, the spread operator, and `JSON.stringify()` ignore them. Detecting every way an instance's keys can be observed is impossible (the instance can escape to code the rule can't see), so this is best-effort: the rule skips the autofix when it sees the common, local patterns (`{...this}`, a rest destructuring of `this`, and `Object.keys`/`values`/`entries`/`assign(…, this)` and `JSON.stringify(this)`), but it does **not** detect `Reflect.ownKeys`, `Object.getOwnPropertyNames`/`Symbols`/`Descriptor(s)`, `Object.hasOwn`, `Object.prototype.hasOwnProperty.call`, the `in` operator, `for…in`, observing static members through the class name, or passing the bare instance elsewhere — those are autofixed even though it may change behavior.
>
> Private fields are also incompatible with `Proxy`-based reactivity/observability libraries such as Vue's `reactive()` and MobX, because the [brand check runs against the proxy rather than the target](https://github.com/tc39/proposal-class-fields/issues/106). This cannot be detected statically, so the rule does not account for it either.
