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

Local functions need no type information. Imported functions require TypeScript (an optional peer dependency), a parser-provided program (for example, `parserOptions.projectService: true`), and source implementations. Declaration files alone are insufficient.

TypeScript, files using the TypeScript parser, and JavaScript with JSDoc types or `@ts-check` receive suggestions instead of autofixes. Review types before applying: defaults do not make explicitly typed properties optional, and removing arguments can affect inference.

## Supported patterns and limitations

The rule checks stable function declarations and `const` function/arrow initializers. Global script function declarations are skipped because writes through the global object cannot be tracked. Values must be primitive literals, including expression-free templates and signed numbers/bigints. `0` differs from `-0`; `undefined` belongs to `no-useless-undefined`.

Spreads, computed/duplicate keys, accessors, methods, `__proto__`, and `Object.prototype` keys are skipped. Functions using `arguments`, generic/overloaded functions, and dynamic scope are skipped. Member calls, constructors, aliases, wrappers, JSX props, and legacy `Function#arguments`/`caller` reflection are unsupported. Imported function declarations are assumed not to be reassigned. Comments that would be discarded prevent edits, but still allow reports.
