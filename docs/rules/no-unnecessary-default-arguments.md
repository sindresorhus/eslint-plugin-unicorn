# no-unnecessary-default-arguments

📝 Disallow arguments and JSX props that match their defaults.

🚫 Disabled by default.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Find trailing arguments, object-literal properties, and JSX props that match their parameter defaults.

This rule is opt-in because explicit arguments can preserve behavior when an API's defaults change.

## Examples

```js
function run(always = true) {}

// ❌
run(true);

// ✅
run();
```

```js
const format = (value, {unit = 'px', digits = 0} = {}) => {};

// ❌
format(width, {unit: 'px', digits: 2});

// ✅
format(width, {digits: 2});
```

Middle arguments are retained to avoid shifting later arguments. Object arguments stay present as `{}` when their final property is removed, preserving outer defaults:

```js
function run({enabled = true} = {enabled: false}) {}

// ❌
run({enabled: true});

// ✅
run({});
```

```jsx
function Badge({color = 'gray'}) {}

// ❌
<Badge color="gray" />;

// ✅
<Badge />;
```

JSX removals are suggestions because omitting a prop can change rendering.

## Type information

Local functions need no type information. Imported functions require TypeScript, [typed linting](https://typescript-eslint.io/getting-started/typed-linting/) (for example, `parserOptions.projectService: true`), and source implementations. Include JavaScript files through `allowJs` or `checkJs`. Declaration files alone are insufficient.

For calls in TypeScript, files using the TypeScript parser, and JavaScript with JSDoc types or `@ts-check`, the rule offers suggestions unless type information confirms a single nongeneric call signature and optional parameters or properties. Object arguments wrapped in parentheses or TypeScript expressions, or with non-nullish union/intersection types, always receive suggestions.

In these files, JSX suggestions require type information that supports omitting the prop. Suggestions for generic tags also require all type arguments to be explicit.

Generic functions are checked only for defaults whose types and initializers are independent of their type parameters. Destructured properties are checked individually; resolving generic aliases and interfaces requires typed linting. Uncertain cases are skipped.

## Supported patterns and limitations

The rule checks stable function declarations, `const` function/arrow initializers, and imported `export default` function/arrow expressions. Global script function declarations are skipped because writes through the global object cannot be tracked. Values must be primitive literals, including expression-free templates and signed numbers/bigints. `0` differs from `-0`; `undefined` belongs to `no-useless-undefined`.

Calls containing spreads retain positional arguments; object arguments before the first spread can still lose matching properties. Object spreads, computed/duplicate keys, accessors, methods, `__proto__`, and `Object.prototype` keys are skipped. The rule skips functions that use `arguments` or declare overloads, and code with dynamic scope. Member calls, constructors, variable aliases, type-asserted callees, `wrap(fn)` initializers, and legacy `Function#arguments`/`caller` reflection are unsupported. Imported function declarations are assumed not to be reassigned. Comments that would be discarded prevent edits, but still allow reports.

JSX checks simple component tags with a resolved value binding. Spreads, duplicate or namespaced attributes, Vue.js directive names, `__proto__`, and known static properties on the component exclude the element. The rule skips `key`, `ref`, `__self`, `__source`, `children` with nested content, and quoted values with tabs, line breaks, or ambiguous character references.
