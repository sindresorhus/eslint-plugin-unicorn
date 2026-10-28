# no-unnecessary-default-arguments

📝 Disallow arguments that match their parameter defaults.

🚫 Disabled by default.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Remove trailing arguments and object-literal properties that match their parameter defaults. Function declarations remain unchanged.

This rule is opt-in because explicit arguments can preserve behavior when an API's defaults change.

## Examples

```js
// ❌
function run(always = true) {}
run(true);

// ✅
run();
```

```js
// ❌
const format = (value, {unit = 'px', digits = 0} = {}) => {};
format(width, {unit: 'px', digits: 2});

// ✅
format(width, {digits: 2});
```

Middle arguments are retained to avoid shifting later arguments. Object arguments stay present as `{}` when their final property is removed, preserving outer defaults:

```js
// ❌
function run({enabled = true} = {enabled: false}) {}
run({enabled: true});

// ✅
run({});
```

## Type information

Local functions need no type information. Imported functions require TypeScript, [typed linting](https://typescript-eslint.io/getting-started/typed-linting/) (for example, `parserOptions.projectService: true`), and source implementations. Include JavaScript files through `allowJs` or `checkJs`. Declaration files alone are insufficient.

TypeScript, files using the TypeScript parser, and JavaScript with JSDoc types or `@ts-check` receive autofixes when the callee has a single nongeneric call signature and type information confirms that the corresponding parameters or properties are optional. For union-typed object arguments, the property must be optional in every non-nullish member. Intersection-typed object arguments receive suggestions instead.

Without type information, or when these checks fail, the rule offers suggestions. Review types before applying: defaults do not make explicitly typed properties optional, and removing arguments can affect inference.

## Supported patterns and limitations

The rule checks stable function declarations, `const` function/arrow initializers, and imported `export default` function/arrow expressions. Global script function declarations are skipped because writes through the global object cannot be tracked. Values must be primitive literals, including expression-free templates and signed numbers/bigints. `0` differs from `-0`; `undefined` belongs to `no-useless-undefined`.

Calls containing spreads retain positional arguments; object arguments before the first spread can still lose matching properties. Object spreads, computed/duplicate keys, accessors, methods, `__proto__`, and `Object.prototype` keys are skipped. The rule skips generic or overloaded declarations, functions using `arguments`, and files with dynamic scope. Member calls, constructors, aliases, `wrap(fn)` initializers, JSX props, and legacy `Function#arguments`/`caller` reflection are unsupported. Imported function declarations are assumed not to be reassigned. Comments that would be discarded prevent edits, but still allow reports.
