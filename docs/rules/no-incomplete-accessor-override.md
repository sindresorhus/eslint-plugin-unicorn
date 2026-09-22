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

Unlike ESLint's [`accessor-pairs`](https://eslint.org/docs/latest/rules/accessor-pairs), this rule compares accessors across inheritance. A one-sided accessor is allowed when no inherited counterpart would be hidden.

## Limitations

The rule checks locally resolvable class declarations and `const` aliases. It skips imported, dynamic, or reassigned superclasses; unknown or symbol computed keys; decorators and ambient declarations; and runtime mutations. It also skips instance `constructor` and static `name` and `length`, which subclasses already own.
