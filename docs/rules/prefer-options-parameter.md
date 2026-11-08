# prefer-options-parameter

📝 Prefer an options object over optional positional parameters.

💼🚫 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config). This rule is _disabled_ in the ☑️ `unopinionated` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Prefer grouping optional positional parameters into a final options object. Named options make calls easier to understand and allow callers to omit individual options without passing `undefined` placeholders.

By default, this rule reports optional positional parameters immediately before an existing options object. Parameters with defaults and TypeScript parameters marked with `?` count as optional. Set `checkWithoutOptionsObject` to `true` to also report two or more consecutive trailing optional positional parameters without an options object.

Changes require updating the function's callers and possibly its types, so the rule does not provide fixes or suggestions.

## Examples

```js
// ❌
function run(input, verbose = false, options = {}) {}

// ✅
function run(input, {verbose = false, ...options} = {}) {}
```

```js
// ❌
function updateSelection(graph, modules, transform = null, {shouldScroll = true} = {}) {}

// ✅
function updateSelection(graph, modules, {transform = null, shouldScroll = true} = {}) {}
```

```ts
// ❌ With {checkWithoutOptionsObject: true}
function run(input: string, verbose?: boolean, retries?: number) {}

// ✅
function run(input: string, {verbose, retries}: {verbose?: boolean; retries?: number} = {}) {}
```

## Options

### checkWithoutOptionsObject

Type: `boolean`\
Default: `false`

Whether to check functions without an existing options object parameter.

With `true`, the rule also reports two or more consecutive trailing optional positional parameters without an existing options object. A single optional positional parameter without an options object is allowed.

```js
// ❌ With {checkWithoutOptionsObject: true}
function run(input, verbose = false, retries = 3) {}

// ✅
function run(input, {verbose = false, retries = 3} = {}) {}
```

Functions such as `clamp(value, minimum = 0, maximum = 1)` are allowed by default.

## Object detection

A final object destructuring pattern or a parameter defaulting to an object literal is recognized as an options object. A default referencing a `const` initialized with an object literal is recognized even when its property values are dynamic. Defaults that safely evaluate to plain objects, including constant aliases and frozen objects, are recognized too.

```js
// ❌
function run(input, verbose = false, options = {}) {}

// ✅
function run(input, {verbose = false, ...options} = {}) {}
```

Nonempty inline TypeScript object types containing only property, method, or index signatures are recognized without type information. Unions and intersections of these types are recognized too; unions may include `undefined`. Call and constructor signatures are excluded.

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

Rest parameters, array patterns, and TypeScript parameter properties stop the trailing parameter check. Optionality is not inferred from unions containing `undefined`, JSDoc, or function bodies. Named types require type information to establish an options object.

For signatures imposed by an external API, use an ESLint disable comment.
