# no-unsafe-json-serialization

📝 Disallow known values that JSON serialization cannot represent faithfully.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallows known values that `JSON.stringify()` and `Response.json()` would discard, alter, or fail to serialize. For example, `JSON.stringify({permissions: new Set(['read'])})` produces `{"permissions":{}}`.

Checks nested object and array literals and simple `const` bindings:

| Value | Default serialization |
| --- | --- |
| `Map`, `Set`, `WeakMap`, `WeakSet` | Entries are lost, usually producing `{}` |
| `BigInt` | Throws a `TypeError` |
| `RegExp` | Pattern and flags are lost, usually producing `{}` |
| Functions and symbols | Omitted in objects, replaced with `null` in arrays, or have no top-level JSON representation |
| `NaN`, `Infinity`, `-Infinity` | Replaced with `null` |
| `undefined` | Replaced with `null` in arrays or has no top-level JSON representation |

`undefined` object properties are allowed for optional properties.

For top-level functions, symbols, and `undefined`, `JSON.stringify()` returns `undefined`, while `Response.json()` throws a `TypeError`.

## Examples

```js
// ❌
JSON.stringify({permissions: new Set(['read'])});
JSON.stringify(new Map([['name', 'unicorn']]));
JSON.stringify({count: 1n});
JSON.stringify(/unicorn/gi);
Response.json({permissions: new Set(['read'])});

// ✅
JSON.stringify({permissions: Array.from(new Set(['read']))});
JSON.stringify(Object.fromEntries(new Map([['name', 'unicorn']])));
JSON.stringify({count: String(1n)});
JSON.stringify({optional: undefined});
Response.json({permissions: Array.from(new Set(['read']))});

const pattern = /unicorn/gi;
JSON.stringify({source: pattern.source, flags: pattern.flags});
```

## Suggestions

Suggestions require choosing a serialization contract:

- Convert a `Set` to an array of values.
- Convert a `Map` to an array of entries or an object. Use an object only for string keys; other keys are coerced and can collide.
- Convert a `BigInt` to a string to preserve precision.

Collection contents must still be JSON-compatible. Other types and unsafe values inside shared object or array literals have no suggestions.

## Custom serialization

`JSON.stringify()` calls with function or unknown replacers are skipped. Known replacer arrays filter properties without converting values. `Response.json()` has no replacer; its second argument contains response options.

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

Detection is best-effort:

- Skips object literals with spreads, unknown or duplicate keys, `toJSON`, or `__proto__`.
- Trusts TypeScript annotations and assertions except on object and array literals. Arbitrary object types and mixed unions are not traversed.
- Does not analyze mutations, cycles, getters, arbitrary member values, collection subclasses, boxed values, BigInt typed-array contents, or custom serialization outside object literals.
