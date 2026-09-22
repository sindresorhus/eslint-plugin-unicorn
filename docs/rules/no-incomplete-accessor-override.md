# no-incomplete-accessor-override

📝 Disallow class accessors that hide an inherited getter or setter.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Property lookup uses the first matching descriptor in the prototype chain. Defining only a setter in a subclass creates a new descriptor without a getter, even when the superclass has one. Defining only a getter similarly hides an inherited setter. This rule reports such overrides when the relevant superclass is defined in the same file.

## Examples

```js
// ❌ Reading `new Child().value` returns `undefined`.
class Base {
	get value() {
		return this._value;
	}
}

class Child extends Base {
	set value(value) {
		this._value = value;
	}
}
```

```js
// ✅ Define both accessors in the subclass.
class Child extends Base {
	get value() {
		return super.value;
	}

	set value(value) {
		this._value = value;
	}
}
```

The rule also reports a getter-only override that hides an inherited setter, and checks static accessors. It reports when an ancestor defines both accessors but the subclass defines only one.

## Limitations

Superclass references must resolve to class declarations or `const` bindings in the same file. The rule skips imported, dynamic, or reassigned superclasses, unknown computed property names, computed symbol keys, and decorated or ambient declarations. It does not track runtime changes to prototypes or class constructors.

The rule skips instance `constructor` and static `name` and `length` because each subclass already owns those properties.

Unlike ESLint's [`accessor-pairs`](https://eslint.org/docs/latest/rules/accessor-pairs), this rule compares accessors across inheritance. A one-sided accessor is allowed when no inherited counterpart would be hidden.
