# prefer-options-parameter

📝 Prefer an options object over optional positional parameters.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

By default, this rule reports optional positional parameters immediately before a final options object. Parameters with defaults or TypeScript `?` count as optional.

Updating callers and types requires manual changes, so the rule provides no fixes or suggestions.

## Examples

```js
// ❌
function run(input, verbose = false, options = {}) {}

// ✅
function run(input, {verbose = false, ...options} = {}) {}
```

## Options

### checkWithoutOptionsObject

Type: `boolean`\
Default: `false`

Whether to check functions without an existing options object parameter.

With `true`, also report two or more consecutive trailing optional positional parameters without an options object.

```js
// ❌ With {checkWithoutOptionsObject: true}
function run(input, verbose = false, retries = 3) {}

// ✅
function run(input, {verbose = false, retries = 3} = {}) {}
```

Functions such as `clamp(value, minimum = 0, maximum = 1)` are allowed by default.

## Object detection

The final parameter is recognized as an options object through:

- Object destructuring.
- An object-literal default, or a `const` initialized with one, even with dynamic property values. Safely evaluated plain-object defaults, including constant aliases and frozen objects, also qualify.
- A nonempty inline TypeScript object type containing only property, method, or index signatures. Named record-shaped interfaces and aliases require type information. Unions and intersections of supported record types qualify; unions may include `undefined`.

Type detection excludes arrays, tuples, callable or constructable types, class instances, constructor-backed native instances, `any`, `unknown`, broad `object`, and empty `{}`. A recognizable default qualifies independently of its type.

Treating a trailing record as configuration is a heuristic; parameter names are ignored.

Rest parameters, array patterns, and TypeScript parameter properties stop the check. Optionality is not inferred from `undefined` unions, JSDoc, or function bodies.
