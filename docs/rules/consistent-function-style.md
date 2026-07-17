# consistent-function-style

📝 Enforce function syntax by role.

🚫 This rule is _disabled_ in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Enforce function syntax by role.

Choosing syntax by function role keeps declarations consistent and makes callbacks, methods, and standalone functions easier to distinguish.

By default, this rule reports nothing. Configure the roles you want to enforce.

This rule does not autofix. Function declarations, function expressions, arrow functions, and object methods are not always semantic equivalents, so `--fix` would be too risky for a style rule.

The rule offers editor suggestions only for simple callback conversions between anonymous function expressions and arrow functions. Suggestions are skipped when the callback contains comments, `this`, `arguments`, `super`, `new.target`, direct `eval()`, generators, named function expressions, or TypeScript type parameters.

## Examples

```js
// eslint unicorn/consistent-function-style: ["error", {namedFunctions: "declaration"}]

// ❌
const parse = value => value;

// ✅
function parse(value) {
	return value;
}
```

```js
// ✅ Reassigned variables are ignored by default.
let transform = value => value;

if (debug) {
	transform = wrap(transform);
}
```

```js
// ✅ Callbacks are ignored by default.
items.map(item => item.id);
```

## Options

Type: `object`

Default:

```js
{
	default: 'ignore',
	namedFunctions: 'ignore',
	namedExports: 'ignore',
	callbacks: 'ignore',
	objectProperties: 'ignore',
	reassignedVariables: 'ignore',
	typedVariables: 'ignore',
}
```

Each option chooses the expected style for a role.

When multiple roles apply, the most specific role wins. Roles are checked in this order:

```js
typedVariables
reassignedVariables
namedExports
callbacks
objectProperties
namedFunctions
default
```

### `default`

Allowed values: `'declaration'`, `'function-expression'`, `'arrow-function'`, `'ignore'`

Fallback style for functions that do not match a more specific role.

### `namedFunctions`

Allowed values: `'declaration'`, `'function-expression'`, `'arrow-function'`, `'ignore'`

Style for function declarations and named variable functions.

### `namedExports`

Allowed values: `'declaration'`, `'function-expression'`, `'arrow-function'`, `'ignore'`

Style for inline named function exports, such as `export function foo() {}` and `export const foo = () => {}`. Export specifier lists like `export {foo}` are ignored.

### `callbacks`

Allowed values: `'function-expression'`, `'arrow-function'`, `'ignore'`

Style for inline functions passed as call or constructor arguments.

### `objectProperties`

Allowed values: `'method'`, `'function-expression'`, `'arrow-function'`, `'ignore'`

Style for object literal function properties.

### `reassignedVariables`

Allowed values: `'function-expression'`, `'arrow-function'`, `'ignore'`

Style for variable functions whose binding is reassigned after initialization.

### `typedVariables`

Allowed values: `'function-expression'`, `'arrow-function'`, `'ignore'`

Style for TypeScript variable functions with an explicit type annotation.

## Limitations

The rule ignores anonymous default exports, export specifier lists, IIFEs, accessors, class methods, class fields, destructuring defaults, TypeScript overload declarations, and generators when the expected style is `'arrow-function'`. Most reports do not have suggestions, because the safe rewrite surface is intentionally narrow.
