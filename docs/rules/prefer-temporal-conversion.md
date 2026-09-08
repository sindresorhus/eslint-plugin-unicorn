# prefer-temporal-conversion

📝 Prefer direct Temporal conversion methods over reconstruction.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧💡 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix) and manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

[Temporal conversion methods](https://tc39.es/proposal-temporal/docs/zoneddatetime.html) convert directly between Temporal types without reconstructing them from individual fields or serialized strings. They remove boilerplate and preserve information that reconstruction can lose, such as submillisecond precision and calendars.

## Examples

```js
const zoned = Temporal.ZonedDateTime.from('2024-01-02T03:04:05.123456789+00:00[UTC]');

// ❌
Temporal.Instant.fromEpochMilliseconds(zoned.epochMilliseconds);
Temporal.Instant.fromEpochNanoseconds(zoned.epochNanoseconds);
Temporal.PlainDate.from(zoned.toString());
new Temporal.PlainDate(zoned.year, zoned.month, zoned.day);

// ✅
zoned.toInstant();
zoned.toPlainDate();
```

```js
const dateTime = Temporal.PlainDateTime.from('2024-01-02T03:04:05.123456789');

// ❌
Temporal.PlainDate.from({year: dateTime.year, month: dateTime.month, day: dateTime.day});
Temporal.PlainTime.from(dateTime.toJSON());

// ✅
dateTime.toPlainDate();
dateTime.toPlainTime();
```

## Supported conversions

| Source | Target | Method |
| ------ | ------ | ------ |
| `Temporal.ZonedDateTime` | `Temporal.Instant` | `.toInstant()` |
| `Temporal.ZonedDateTime` | `Temporal.PlainDateTime` | `.toPlainDateTime()` |
| `Temporal.ZonedDateTime` or `Temporal.PlainDateTime` | `Temporal.PlainDate` | `.toPlainDate()` |
| `Temporal.ZonedDateTime` or `Temporal.PlainDateTime` | `Temporal.PlainTime` | `.toPlainTime()` |

The rule checks epoch milliseconds and nanoseconds, `.from(source.toString())`, `.from(source.toJSON())`, and constructors or property bags copying all fields of the target type. Time reconstructions must include all six time fields, through `nanosecond`. Date property bags can use `month` or `monthCode`, and can include `calendar: source.calendarId`.

Sources must be identifiable from canonical `Temporal.*` constructors, `.from()` factories, `Temporal.Now.zonedDateTimeISO()`, `Temporal.Now.plainDateTimeISO()`, constant bindings, or explicit TypeScript types. TypeScript type information is used when available. Normally named `Temporal` imports from polyfills are supported. Unknown receivers and ordinary data objects are ignored.

The rule does not check partial or modified fields, extra properties, mixed receivers, spreads, optional chaining, computed names, parsing or serialization options, explicit alternative calendars, same-type cloning, direct `.from(source)`, string manipulation, `Date` interoperability, or conversions requiring extra arguments or intermediate types. It does not track renamed Temporal imports or infer arbitrary method chains.

## Fixes and suggestions

Exact conversions are automatically fixable: nanosecond-based instant reconstruction, serialization into plain types, complete time-field reconstruction, and date-bearing property bags explicitly retaining the source calendar.

The following receive editor suggestions because replacing them can change the result:

- Millisecond-based instant reconstruction discards submillisecond precision.
- Serialization into an instant can lose seconds because `ZonedDateTime` serialization rounds historical timezone offsets to minutes.
- Date-bearing property bags without a calendar default to ISO 8601.
- Date-bearing constructors interpret their numeric arguments as ISO fields, even when a calendar is supplied.

Use an explicit rounding operation when discarding precision is intentional. Reconstructions containing comments are reported without a fix or suggestion.
