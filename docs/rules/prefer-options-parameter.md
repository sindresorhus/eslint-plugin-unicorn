# prefer-options-parameter

📝 Prefer an options object over optional positional parameters.

🚫 Disabled by default.

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer grouping optional positional parameters into a final options object. Named options make calls easier to understand and allow callers to omit individual options without passing `undefined` placeholders.

This rule reports two or more consecutive trailing optional positional parameters, or one or more immediately before an existing options object. Parameters with defaults and TypeScript parameters marked with `?` count as optional. A single optional positional parameter without an options object is allowed.

Changes require updating the function's callers and possibly its types, so the rule does not provide fixes or suggestions.

## Examples

```js
// ❌
function run(input, verbose = false, retries = 3) {}

// ✅
function run(input, {verbose = false, retries = 3} = {}) {}
```

```js
// ❌
function updateSelection(graph, modules, transform = null, {shouldScroll = true} = {}) {}

// ✅
function updateSelection(graph, modules, {transform = null, shouldScroll = true} = {}) {}
```

```ts
// ❌
function run(input: string, verbose?: boolean, retries?: number) {}

// ✅
function run(input: string, {verbose, retries}: {verbose?: boolean; retries?: number} = {}) {}
```

## Options

### checkWithoutOptionsObject

Type: `boolean`\
Default: `true`

Whether to check functions without an existing options object parameter.

With `false`, only optional positional parameters immediately before an existing options object are reported.

```js
// ❌ With {checkWithoutOptionsObject: false}
function run(input, verbose = false, {retries = 3} = {}) {}

// ✅
function run(input, {verbose = false, retries = 3} = {}) {}
```

Functions such as `clamp(value, minimum = 0, maximum = 1)` are allowed with this option disabled.

## Object detection

A final object destructuring pattern or a parameter defaulting to an object literal is recognized as an options object. A default referencing a `const` initialized with an object literal is recognized even when its property values are dynamic. Defaults that safely evaluate to plain objects, including constant aliases and frozen objects, are recognized too.

```js
// ❌
function run(input, verbose = false, options = {}) {}

// ✅
function run(input, {verbose = false, ...options} = {}) {}
```

Nonempty inline TypeScript object types containing only property, method, or index signatures are recognized without type information. Call and constructor signatures are excluded.

When TypeScript type information is available, named record-shaped interfaces and object type aliases are recognized too. Arrays, tuples, callable or constructable types, class instances, constructor-backed native instance types, `any`, `unknown`, and broad `object` or empty `{}` types do not establish an options object. Unions and intersections must consist of supported record types, apart from `undefined`.

```ts
interface Options {
	encoding?: string;
}

// ❌ With type information
function run(verbose = false, options?: Options) {}

// ✅
function run({verbose = false, encoding}: Options & {verbose?: boolean} = {}) {}
```

Treating a trailing record-shaped parameter as configuration is a heuristic. Parameter names are not used. A recognizable default is independent evidence, even when its type alone is inconclusive.

Rest parameters, array patterns, and TypeScript parameter properties stop the trailing parameter check. Optionality is not inferred from unions containing `undefined`, JSDoc, or function bodies. Named and composite types require type information to establish an options object.

For signatures imposed by an external API, use an ESLint disable comment.
