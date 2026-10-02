# no-unsafe-json-serialization

📝 Disallow known values that JSON serialization cannot represent faithfully.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`JSON.stringify()` and `Response.json()` can silently discard data or throw when a value has no faithful JSON representation. For example, `JSON.stringify({permissions: new Set(['read'])})` produces `{"permissions":{}}`.

This rule checks known values passed to `JSON.stringify()` and `Response.json()`, including nested object and array literals and simple `const` bindings:

| Value | Default serialization |
| --- | --- |
| `Map`, `Set`, `WeakMap`, `WeakSet` | Entries are lost, usually producing `{}` |
| `BigInt` | Throws a `TypeError` |
| `RegExp` | Pattern and flags are lost, usually producing `{}` |
| Functions and symbols | Omitted in objects, replaced with `null` in arrays, or have no top-level JSON representation |
| `NaN`, `Infinity`, `-Infinity` | Replaced with `null` |
| `undefined` | Replaced with `null` in arrays or has no top-level JSON representation |

`undefined` object properties are allowed because omitting optional properties is commonly intentional.

For top-level functions, symbols, and `undefined`, `JSON.stringify()` returns `undefined`, while `Response.json()` throws a `TypeError`.

## Examples

```js
// ❌
JSON.stringify({permissions: new Set(['read'])});
JSON.stringify(new Map([['name', 'unicorn']]));
JSON.stringify({count: 1n});
JSON.stringify([undefined]);
JSON.stringify({value: Infinity});
JSON.stringify({callback: () => {}});
JSON.stringify(/unicorn/gi);
Response.json({permissions: new Set(['read'])});
Response.json(1n);

// ✅
JSON.stringify({permissions: Array.from(new Set(['read']))});
JSON.stringify(Object.fromEntries(new Map([['name', 'unicorn']])));
JSON.stringify({count: String(1n)});
JSON.stringify([null]);
JSON.stringify({value: null});
JSON.stringify({optional: undefined});
JSON.stringify(new Date());
Response.json({permissions: Array.from(new Set(['read']))});

const pattern = /unicorn/gi;
JSON.stringify({source: pattern.source, flags: pattern.flags});
```

## Suggestions

The rule offers suggestions instead of automatic fixes because each conversion chooses a serialization contract:

- Convert a `Set` to an array of values. The values must themselves be JSON-compatible.
- Convert a `Map` to an array of entries or an object. Choose an object only when the keys are strings; other keys are coerced and can collide. The entry-array suggestion preserves the entry structure, but the keys and values must themselves be JSON-compatible.
- Convert a `BigInt` to a string to preserve precision.

Weak collections cannot be enumerated, so the rule offers no conversion suggestion for them. Regular expressions require choosing a representation, such as a pattern string or an object containing `source` and `flags`. Other unsupported values also require an explicit JSON representation. When a problem is found inside a shared object or array initializer, it is reported at the serialization site without suggesting changes to that initializer.

## Custom serialization

`JSON.stringify()` calls with a function replacer or an unknown replacer are skipped. A statically known replacer array is respected as a property filter; it does not convert collections or other unsupported values. `Response.json()` has no replacer parameter; its second argument contains response options and does not suppress these checks.

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

This rule targets explicit, known values rather than proving that arbitrary objects are JSON-compatible:

- Circular references, mutations, arbitrary member values, spread contents, and getters are not analyzed.
- Object literals with spreads, unknown computed keys, duplicate keys, a `toJSON` property, or a `__proto__` property are skipped because they can change serialization behavior.
- Custom `toJSON` detection is limited to object literals. Hooks on typed values, functions, classes, or patched prototypes are not resolved.
- Collections, BigInts, functions, symbols, and regular expressions can be identified from known types, with additional coverage when TypeScript type information is available. Type annotations and assertions on references are trusted, so incorrect types can cause false positives. `undefined` and non-finite numbers are identified from explicit expressions or static values.
- Arbitrary object types and mixed unions containing supported values are not recursively inspected.
- Collection subclasses, boxed primitive values, and shadowed native constructors are unsupported.
- Non-BigInt typed arrays, dates, URLs, and other objects with standard JSON representations are allowed. `BigInt64Array` and `BigUint64Array` contents are not inspected, even though nonempty arrays throw during serialization.

## Related rules

- [`no-object-methods-with-collections`](./no-object-methods-with-collections.md) checks `Object.keys()`, `Object.values()`, and `Object.entries()` on collections.
- [`no-collection-bracket-access`](./no-collection-bracket-access.md) checks collection entry access.
- [`prefer-structured-clone`](./prefer-structured-clone.md) replaces the cloning idiom `JSON.parse(JSON.stringify(value))`. Both rules can report when the cloned value is known to be unsafe for JSON serialization.
- [`prefer-response-static-json`](./prefer-response-static-json.md) prefers `Response.json()` over `new Response(JSON.stringify())`. This rule checks the serialized values in both forms.
- [`@eslint/json/no-unsafe-values`](https://github.com/eslint/json/blob/main/docs/rules/no-unsafe-values.md) checks interoperability hazards in JSON files rather than JavaScript serialization calls.

See the [JSON serialization reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify), [ECMAScript serialization algorithm](https://tc39.es/ecma262/multipage/structured-data.html#sec-serializejsonproperty), and [`Response.json()` specification](https://fetch.spec.whatwg.org/#dom-response-json).
