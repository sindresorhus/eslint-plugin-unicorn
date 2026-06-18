# no-nonstandard-builtin-properties

📝 Disallow non-standard properties on built-in objects.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

JavaScript lets code read or call any property name, even when the property is not part of a built-in object. This often hides typos like `Object.entires()` or relies on native objects being extended at runtime.

This rule checks known built-in constructors, namespaces, prototypes, and obvious built-in instances against a static string-named built-in property list. It reports properties that are not part of that standard property surface, and reports built-in properties that exist but are called, tagged, or used as constructors when that use is not valid. Calls and construction through `constructor` are ignored to keep the rule focused on non-standard property names.

## Examples

```js
// ❌
Object.entires(object);

// ✅
Object.entries(object);
```

```js
// ❌
Math.NON_EXISTS_PROPERTY;

// ✅
Math.PI;
```

```js
// ❌
Promise.nonExistsMethod();

// ✅
Promise.race(promises);
```

```js
// ❌
Array.prototype.customMethod = function () {};

// ✅
Array.prototype.map.call(array, callback);
```

```js
// ❌
'text'.length();

// ✅
'text'.length;
```

```js
// ❌
new Math.PI();

// ✅
Math.PI;
```

## Limitations

The static list tracks the latest published ECMAScript edition and selected web-standard built-ins, not runtime-specific extensions or separate proposal drafts.

The rule only checks direct references to known built-ins. It does not track aliases, infer return types from function calls, or check dynamic computed properties.
