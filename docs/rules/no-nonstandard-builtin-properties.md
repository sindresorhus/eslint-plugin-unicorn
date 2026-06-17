# no-nonstandard-builtin-properties

📝 Disallow non-standard properties on built-in objects.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

JavaScript lets code read or call any property name, even when the property is not part of a built-in object. This often hides typos like `Object.entires()` or relies on native objects being extended at runtime.

This rule checks known built-in constructors, namespaces, prototypes, and obvious built-in instances against a static built-in property list. It reports properties that are not part of that standard property surface, and reports calls to built-in properties that exist but are not callable.

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

## Limitations

Computed access with non-static property names is ignored. Static computed keys are still checked.

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
