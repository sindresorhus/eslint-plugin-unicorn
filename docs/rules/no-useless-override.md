# no-useless-override

📝 Disallow useless overrides of class methods.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

A class method that does nothing but forward to `super.sameMethod(...)` with the same arguments is dead code. Removing it is equivalent to inheriting the parent method, so the override only adds noise and a maintenance burden. This is the method counterpart to [`no-useless-constructor`](https://eslint.org/docs/latest/rules/no-useless-constructor).

## Examples

```js
// ❌
class Foo extends Bar {
	doThing(a, b) {
		return super.doThing(a, b);
	}
}

// ✅
class Foo extends Bar {} // Inherits `doThing` from `Bar`.
```

```js
// ❌ Reported only with type information, when `render` is known to return nothing.
class Foo extends Bar {
	render(...args) {
		super.render(...args);
	}
}

// ✅ The override adds behavior.
class Foo extends Bar {
	render(...args) {
		this.prepare();
		super.render(...args);
	}
}
```

```js
// ✅ Not a plain passthrough; arguments are changed.
class Foo extends Bar {
	doThing(a) {
		return super.doThing(a, true);
	}
}
```

## Limitations

To stay safe, the rule only reports cases where removal cannot change behavior. It skips getters/setters, generators, decorated methods, methods with accessibility modifiers, and methods with TypeScript overload signatures.

The statement form `super.method(…)` (without `return`) and `async` methods are only reported with [type information](https://typescript-eslint.io/getting-started/typed-linting) available — when the parent is known to return nothing or a promise, respectively.
