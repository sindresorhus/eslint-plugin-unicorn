# no-invalid-temporal-arithmetic

📝 Disallow statically known invalid Temporal arithmetic.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Reports statically known Temporal arithmetic failures: unsupported duration units, missing `relativeTo`, and invalid units, rounding settings, or `overflow` options.

Instant arithmetic rejects nonzero years, months, weeks, and days. Duration `add()` and `subtract()` reject nonzero years, months, and weeks even with `relativeTo`. PlainYearMonth arithmetic permits nonzero fields only for years and months. For Duration totals, rounding, and comparison, days alone do not require `relativeTo`.

## Examples

```js
// ❌
Temporal.Now.instant().add({days: 1});

// ✅
Temporal.Now.instant().add({hours: 24});
```

```js
// ❌
Temporal.Duration.from({months: 1}).total('hours');

// ✅
Temporal.Duration.from({months: 1}).total({unit: 'hours', relativeTo: '2024-01-01'});
```

```js
// ❌
Temporal.Duration.from({hours: 1}).total({smallestUnit: 'hour'});

// ✅
Temporal.Duration.from({hours: 1}).total({unit: 'hour'});
```

## Units and rounding

| Receiver | Operation | Allowed units |
| --- | --- | --- |
| Duration | `total`, `round` | Year through nanosecond |
| Instant, PlainTime | `round`, `since`, `until` | Hour through nanosecond |
| PlainDateTime, ZonedDateTime | `round` | Day through nanosecond |
| PlainDate | `since`, `until` | Year through day |
| PlainYearMonth | `since`, `until` | Year and month |
| PlainDateTime, ZonedDateTime | `since`, `until` | Year through nanosecond |

Units accept singular and plural names. `largestUnit` accepts `auto` in Duration rounding and difference operations. Defaults apply before checking unit ordering. Only options read by the method are checked.

`roundingIncrement` is truncated and must be between `1` and `1_000_000_000`. Instant rounding increments must divide a 24-hour day; other time increments must divide, and be smaller than, the next larger unit:

```js
// ❌
Temporal.Now.plainTimeISO().round({smallestUnit: 'minute', roundingIncrement: 90});

// ✅
Temporal.Now.instant().round({smallestUnit: 'minute', roundingIncrement: 90});
```

PlainDateTime and ZonedDateTime day rounding requires increment `1`. Duration date-unit rounding with increments greater than `1` requires matching largest and smallest units; difference operations do not.

## Suggestions

Suggestions can correct `unit`/`smallestUnit` mixups in `total()`/`round()`, or convert an Instant's single-property `{days: amount}` to hours when both amounts are safe integers. Unit-key corrections require no other known contract error.

> [!IMPORTANT]
> A calendar day can differ from 24 elapsed hours across daylight-saving transitions. Use `Temporal.ZonedDateTime` arithmetic to preserve the local time on the next calendar day.

These changes can alter intent, so no automatic fixes are provided.

## Static analysis

Recognizes `Temporal` constructors and factories, constant aliases, and TypeScript types. Checks simple inline bags, constant primitives, immutable Durations, and common uppercase ISO duration strings. Dynamic values, separately bound bags, ambiguous receiver types, and untyped method chains are ignored.

`relativeTo` is missing only when absent or statically `undefined`. Duration construction, date ranges, and calendar or time-zone compatibility are not validated.

## Related rules

[`prefer-temporal`](./prefer-temporal.md) encourages adoption; [`prefer-temporal-conversion`](./prefer-temporal-conversion.md) simplifies conversions.

## References

- [Temporal specification](https://tc39.es/proposal-temporal/)
- [PlainYearMonth arithmetic](https://tc39.es/proposal-temporal/#sec-temporal-adddurationtoyearmonth)
- [Instant arithmetic](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Instant/add)
- [Duration totals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Duration/total)
- [Rounding increments for Instant](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/Instant/round)
