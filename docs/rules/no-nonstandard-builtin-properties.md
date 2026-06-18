# no-nonstandard-builtin-properties

📝 Disallow non-standard properties on built-in objects.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

JavaScript lets code read or call any property name, even when the property is not part of a built-in object. This often hides typos like `Object.entires()` or relies on native objects being extended at runtime.

This rule checks known built-in constructors, namespaces, prototypes, and obvious built-in instances against a static string-named built-in property list. It reports properties that are not part of that standard property surface, and reports built-in properties that exist but are called, tagged, or used as constructors when that use is not valid.

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

The static list tracks the main ECMAScript draft and selected web-standard built-ins. It does not include runtime-specific extensions or separate proposal drafts.

Computed access with non-static or non-string property names is ignored. Static computed string keys are still checked.

```js
// ❌
Object['entires'](value);

// ✅
Object[method](value);
```

Shadowed built-ins are ignored.

```js
// ✅
const Object = {
	entires(value) {
		return value;
	},
};

Object.entires(value);
```

Aliases are ignored.

```js
// ✅
const {Object: BuiltinObject} = globalThis;
BuiltinObject.entires(value);
```

Return values from built-in function calls are ignored.

```js
// ✅
Array().customProperty;
```

Object literals are ignored because their properties are usually user-defined.

```js
// ✅
({entires: value}).entires;
```
