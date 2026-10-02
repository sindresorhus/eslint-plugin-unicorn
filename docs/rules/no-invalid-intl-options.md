# no-invalid-intl-options

📝 Disallow invalid or ignored Intl options.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Disallow unknown, invalid, incompatible, and clearly ignored options in inline option objects passed to [Intl APIs](https://tc39.es/ecma402/).

Misspelled option names are silently ignored, while invalid values and combinations can throw at runtime. This rule checks both kinds of mistakes using the specification, independently of the JavaScript runtime's Intl implementation.

## Examples

```js
// ❌
new Intl.NumberFormat('en', {maximumFractionDigit: 2});
new Intl.NumberFormat('en', {style: 'currency'});
new Intl.NumberFormat('en', {style: 'unit', unit: 'meters'});
new Intl.NumberFormat('en', {minimumFractionDigits: 3, maximumFractionDigits: 2});
new Intl.DateTimeFormat('en', {dateStyle: 'short', year: 'numeric'});
new Intl.DurationFormat('en', {hours: 'numeric', minutes: 'long'});
new Intl.DisplayNames('en', {});

// ✅
new Intl.NumberFormat('en', {maximumFractionDigits: 2});
new Intl.NumberFormat('en', {style: 'currency', currency: 'USD'});
new Intl.NumberFormat('en', {style: 'unit', unit: 'meter'});
new Intl.NumberFormat('en', {minimumFractionDigits: 2, maximumFractionDigits: 3});
new Intl.DateTimeFormat('en', {dateStyle: 'short'});
new Intl.DurationFormat('en', {hours: 'numeric', minutes: '2-digit'});
new Intl.DisplayNames('en', {type: 'language'});
```

## Supported APIs

- All ten standard Intl constructors: `Collator`, `DateTimeFormat`, `DisplayNames`, `DurationFormat`, `ListFormat`, `Locale`, `NumberFormat`, `PluralRules`, `RelativeTimeFormat`, and `Segmenter`.
- The callable forms of `Intl.Collator`, `Intl.DateTimeFormat`, and `Intl.NumberFormat`.
- `supportedLocalesOf()` on each constructor except `Intl.Locale`. Only `localeMatcher` is accepted here.
- `localeCompare()` on known String receivers, using Collator options in the third argument.
- `toLocaleString()` on known Number, BigInt, and typed-array receivers, using NumberFormat options.
- `toLocaleString()`, `toLocaleDateString()`, and `toLocaleTimeString()` on known Date receivers, using DateTimeFormat options. `toLocaleDateString()` disallows `timeStyle`, and `toLocaleTimeString()` disallows `dateStyle`.

Constructor aliases and global-qualified references such as `globalThis.Intl` are supported. Statically known computed option keys and receiver method names are supported. Computed constructor references that depend on bindings are skipped. Receiver types can be identified from JavaScript expressions, TypeScript annotations, or available TypeScript type information.

## Checks

The rule reports:

- Unknown option names, including options belonging to a different Intl constructor.
- Invalid enum values, numeric limits, rounding increments, currency and unit identifiers, and Unicode locale option syntax.
- Missing `currency` for currency style, missing `unit` for unit style, and missing DisplayNames `type` in an inspected option object.
- Incompatible date/time styles and explicit components, active digit bounds, rounding increments and significant-digit rounding, and DurationFormat unit style progression or fractional unit display settings.
- Clearly ignored currency or unit settings outside their corresponding style, `compactDisplay` outside compact notation, fraction limits overridden by significant-digit rounding, `hourCycle` overridden by `hour12`, `formatMatcher` with date/time styles, and `languageDisplay` for non-language DisplayNames types.

Each property receives at most one diagnostic. Invalid values and incompatible combinations take precedence over ignored-option reports.

Values follow the specification's coercion rules. For example, numeric strings are accepted, fractional numeric options are floored after range validation, boolean options use boolean coercion, and both `"true"` and `"false"` are accepted for `useGrouping`. Options set to `undefined` use their defaults.

```js
// ❌: Fraction limits are ignored when significant-digit rounding takes precedence.
new Intl.NumberFormat('en', {maximumSignificantDigits: 3, maximumFractionDigits: 2});

// ✅
new Intl.NumberFormat('en', {maximumSignificantDigits: 3});
new Intl.NumberFormat('en', {maximumFractionDigits: '2.9', useGrouping: 'false'});
```

## Suggestions

Unknown option names receive a rename suggestion when exactly one accepted name matches after case folding and at most one insertion, deletion, substitution, or adjacent transposition. Suggestions preserve shorthand value bindings and are omitted if they would introduce a duplicate property or remove a comment.

The rule has no automatic fixes. It does not guess replacement values or corrections for incompatible combinations.

## Analysis limits

Only inline object literals are inspected, including literals wrapped in TypeScript assertions, non-null assertions, or `satisfies`. The entire option object is skipped if it contains spreads, unresolved keys, duplicate keys, accessors, methods, or prototype-setting properties. Calls with argument spreads before or at the options argument are skipped.

Only statically known primitive values are validated. Dynamic or potentially mutable values remain unknown, and dependent checks are skipped when their controlling values are unknown. Object coercion and user code are not executed.

Option-object bindings, generic Arrays, Temporal methods, borrowed methods, and subclasses are outside the rule's scope. Missing constructor arguments are handled by [`no-invalid-argument-count`](./no-invalid-argument-count.md).

The rule does not check currency, calendar, numbering-system, collation, or time-zone availability. Unknown but well-formed identifiers are accepted where the specification permits them. It does not infer locale-dependent usefulness or currency-specific default fraction digits. Rounding-increment checks compare fraction-bound equality only when both bounds are explicitly known.
