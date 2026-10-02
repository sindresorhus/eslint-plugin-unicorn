# no-invalid-temporal-arithmetic

📝 Disallow statically known invalid Temporal arithmetic.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Temporal separates elapsed time from calendar arithmetic. This rule reports arithmetic calls that are statically known to violate its API contracts:

- `Temporal.Instant#add()` and `subtract()` with nonzero years, months, weeks, or days.
- `Temporal.Duration#add()` and `subtract()` with nonzero years, months, or weeks in either operand. These methods do not accept `relativeTo` to enable calendar arithmetic.
- `Temporal.Duration#total()` and `round()` without `relativeTo` when calendar units are involved. Days alone do not require a reference date.
- `Temporal.Duration.compare()` without `relativeTo` when both durations are fully known, have different component values, and contain years, months, or weeks. Identical records do not need a reference date.
- Invalid `overflow` options for calendar-type `add()` and `subtract()` calls.
- Invalid units, rounding modes, rounding increments, missing required units, and incompatible largest and smallest units for `round()`, `since()`, and `until()`.

The rule checks only options read by the method. Singular and plural unit names are accepted, and defaults are applied before checking unit ordering. It reports one problem per call and provides suggestions where the intended correction can be made explicit.

## Examples

```js
// ❌
Temporal.Now.instant().add({days: 1});
Temporal.Duration.from({months: 1}).add({days: 1});
Temporal.Duration.from({months: 1}).total('hours');
Temporal.Duration.from({hours: 1}).total({smallestUnit: 'hour'});
Temporal.Now.plainTimeISO().round({smallestUnit: 'minute', roundingIncrement: 7});
Temporal.Now.instant().until(other, {largestUnit: 'minute', smallestUnit: 'hour'});

// ✅
Temporal.Now.instant().add({hours: 24});
Temporal.Now.zonedDateTimeISO().add({days: 1});
Temporal.PlainDate.from('2024-01-01').add({months: 1, days: 1});
Temporal.Duration.from({months: 1}).total({unit: 'hours', relativeTo: '2024-01-01'});
Temporal.Duration.from({days: 1}).total('hours');
Temporal.Duration.from({hours: 1}).total({unit: 'hour'});
Temporal.Now.plainTimeISO().round({smallestUnit: 'minute', roundingIncrement: 15});
Temporal.Now.instant().until(other, {largestUnit: 'hour', smallestUnit: 'minute'});
```

## Suggestions

The rule can suggest correcting `smallestUnit` to `unit` in `total()`, or `unit` to `smallestUnit` in `round()`, when the corrected options have no other known contract error.

For an Instant's single-property `{days: amount}` argument, it can suggest treating each day as 24 elapsed hours when the amount and resulting hours are safe integers.

> [!IMPORTANT]
> A calendar day and 24 elapsed hours can differ across daylight-saving transitions. Use `Temporal.ZonedDateTime` arithmetic to preserve the local time on the next calendar day. Choose the elapsed-hours suggestion only when that is the intended meaning.

No automatic fixes are provided because these corrections can change the intended calculation.

## Static analysis

Recognized receivers include canonical `Temporal` constructors, `.from()` factories, Instant epoch factories, applicable `Temporal.Now` factories, constant aliases, and explicit Temporal TypeScript types. Qualified Temporal types are also recognized when TypeScript type information is available. Ambiguous receiver unions are ignored.

Options and duration property bags must be inline, with ordinary noncomputed properties. Duplicate properties use the last value. Bags containing spreads, computed keys, getters, methods, or prototype overrides are ignored. Constant primitive expressions are supported, but separately bound property bags are not traced.

Known duration values can also come from positional constructors, `.from()` calls, immutable constant aliases, or a common ISO string subset: uppercase units, integer components, an optional `+` or `-` sign, and up to nine fractional-second digits. Other string forms and unsafe numeric components are ignored.

An absent or statically `undefined` `relativeTo` is treated as missing. An unknown supplied value suppresses the missing-context diagnostic. The rule does not validate duration construction, date ranges, calendar or time-zone compatibility, or arbitrary method chains. It does not require native Temporal support or a polyfill.

## Related rules

[`prefer-temporal`](./prefer-temporal.md) encourages Temporal adoption, and [`prefer-temporal-conversion`](./prefer-temporal-conversion.md) simplifies conversions. This rule checks arithmetic contracts after Temporal is already in use.

## References

- [Temporal specification](https://tc39.es/proposal-temporal/)
- [Instant arithmetic](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Instant/add)
- [Duration totals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Duration/total)
- [Rounding increments for Instant](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Instant/round)
