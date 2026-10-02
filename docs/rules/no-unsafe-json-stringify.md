# no-unsafe-json-stringify

📝 Disallow known values that JSON serialization cannot represent faithfully.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`JSON.stringify()` can silently discard data or throw when a value has no faithful JSON representation. For example, `JSON.stringify({permissions: new Set(['read'])})` produces `{"permissions":{}}`.

This rule checks known values passed to `JSON.stringify()`, including nested object and array literals and simple `const` bindings:

| Value | Default serialization |
| --- | --- |
| `Map`, `Set`, `WeakMap`, `WeakSet` | Entries are lost, usually producing `{}` |
| `BigInt` | Throws a `TypeError` |
| Functions and symbols | Omitted in objects, replaced with `null` in arrays, or return `undefined` at the top level |
| `NaN`, `Infinity`, `-Infinity` | Replaced with `null` |
| `undefined` | Replaced with `null` in arrays or returns `undefined` at the top level |

`undefined` object properties are allowed because omitting optional properties is commonly intentional.

## Examples

```js
// ❌
JSON.stringify({permissions: new Set(['read'])});
JSON.stringify(new Map([['name', 'unicorn']]));
JSON.stringify({count: 1n});
JSON.stringify([undefined]);
JSON.stringify({value: Infinity});
JSON.stringify({callback: () => {}});

// ✅
JSON.stringify({permissions: Array.from(new Set(['read']))});
JSON.stringify(Object.fromEntries(new Map([['name', 'unicorn']])));
JSON.stringify({count: String(1n)});
JSON.stringify([null]);
JSON.stringify({value: null});
JSON.stringify({optional: undefined});
JSON.stringify(new Date());
```

## Suggestions

The rule offers suggestions instead of automatic fixes because each conversion chooses a serialization contract:

- Convert a `Set` to an array of values.
- Convert a `Map` to an array of entries or an object. Choose an object only when the keys are strings; other keys are coerced and can collide. The entry-array suggestion preserves the entry structure, but the keys and values must themselves be JSON-compatible.
- Convert a `BigInt` to a string to preserve precision.

Weak collections cannot be enumerated, so the rule offers no conversion suggestion for them. Other unsupported values require choosing an explicit JSON representation. When a problem is found inside a shared object or array initializer, it is reported at the serialization site without suggesting changes to that initializer.

## Custom serialization

Calls with a function replacer or an unknown replacer are skipped. A statically known replacer array is respected as a property filter; it does not convert collections or other unsupported values.

```js
// ✅
JSON.stringify({permissions: new Set(['read'])}, (key, value) => {
	return value instanceof Set ? Array.from(value) : value;
});

JSON.stringify({permissions: new Set(['read']), name: 'unicorn'}, ['name']);

JSON.stringify({
	permissions: new Set(['read']),
	toJSON() {
		return {permissions: Array.from(this.permissions)};
	},
});
```

## Limitations

This rule targets explicit, known values rather than proving that arbitrary objects are JSON-compatible. It does not analyze circular references, mutations, arbitrary member values, spread contents, getters, or collection subclasses. Object literals with spreads, unknown computed keys, duplicate keys, a `toJSON` property, or a `__proto__` property are skipped because they can change serialization behavior. Custom `toJSON` detection is limited to object literals; hooks on typed collections, functions, classes, or patched prototypes are not resolved. Shadowed native constructors are unsupported.

Collections, BigInts, functions, and symbols can be identified from known types, with additional coverage when TypeScript type information is available. `undefined` and non-finite numbers are identified from explicit expressions or static values. Arbitrary object types and mixed unions containing supported values are not recursively inspected. Numeric typed arrays, dates, URLs, and other objects with standard JSON representations are allowed.

## Related rules

- [`no-object-methods-with-collections`](./no-object-methods-with-collections.md) checks `Object.keys()`, `Object.values()`, and `Object.entries()` on collections.
- [`no-collection-bracket-access`](./no-collection-bracket-access.md) checks collection entry access.
- [`prefer-structured-clone`](./prefer-structured-clone.md) replaces the cloning idiom `JSON.parse(JSON.stringify(value))`. Both rules can report when the cloned value is known to be unsafe for JSON serialization.
- [`prefer-response-static-json`](./prefer-response-static-json.md) prefers `Response.json()` over `new Response(JSON.stringify())`; it does not validate the serialized values.
- [`@eslint/json/no-unsafe-values`](https://github.com/eslint/json/blob/main/docs/rules/no-unsafe-values.md) checks interoperability hazards in JSON files rather than JavaScript serialization calls.

See the [JSON serialization reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) and [ECMAScript serialization algorithm](https://tc39.es/ecma262/multipage/structured-data.html#sec-serializejsonproperty).
