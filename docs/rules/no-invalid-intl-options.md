# no-invalid-intl-options

📝 Disallow invalid or ignored Intl options.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Validate inline [Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl) option objects, catching misspelled names, invalid values, missing required options, incompatible combinations, and ignored settings.

## Examples

```js
// ❌
new Intl.NumberFormat('en', {maximumFractionDigit: 2});

// ✅
new Intl.NumberFormat('en', {maximumFractionDigits: 2});
```

```js
// ❌
new Intl.NumberFormat('en', {style: 'currency'});

// ✅
new Intl.NumberFormat('en', {style: 'currency', currency: 'USD'});
```

```js
// ❌
new Intl.DateTimeFormat('en', {dateStyle: 'short', year: 'numeric'});

// ✅
new Intl.DateTimeFormat('en', {dateStyle: 'short'});
```

## Supported APIs

- All Intl constructors, callable `Collator`/`DateTimeFormat`/`NumberFormat`, and `supportedLocalesOf()` (`localeMatcher` only).
- String `localeCompare()`.
- Number, BigInt, and typed-array `toLocaleString()`.
- Date `toLocaleString()`, `toLocaleDateString()`, and `toLocaleTimeString()`.

Aliases, global-qualified references, and statically known computed keys are supported. Method receivers must have known JavaScript or TypeScript types.

Unambiguous single-edit typos receive rename suggestions. There are no automatic fixes.

## Analysis limits

Only inline object literals and statically known primitives are checked. Objects with spreads, unresolved/duplicate keys, accessors, methods, or prototype-setting properties are skipped, as are calls with argument spreads before or at the options argument.

Option-object bindings, Arrays, Temporal, borrowed methods, subclasses, and alias reassignment are unsupported. User code is never executed. Runtime availability, locale-dependent usefulness, and currency-specific fraction defaults are not checked.
