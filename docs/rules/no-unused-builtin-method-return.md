# no-unused-builtin-method-return

📝 Disallow ignoring the return value of selected built-in methods.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->

Ignoring the result of methods like `.map()`, `.find()`, `.includes()`, or `.join()` is usually a bug or dead code.

If you intentionally want to discard the return value, use `void` to make that explicit.

This rule covers selected array instance methods that return a computed value:

- `.at()`
- `.concat()`
- `.entries()`
- `.every()`
- `.filter()`
- `.find()`
- `.findIndex()`
- `.findLast()`
- `.findLastIndex()`
- `.flat()`
- `.flatMap()`
- `.includes()`
- `.indexOf()`
- `.join()`
- `.keys()`
- `.lastIndexOf()`
- `.map()`
- `.some()`
- `.slice()`
- `.toReversed()`
- `.toSorted()`
- `.toSpliced()`
- `.values()`
- `.with()`

For `.values()` and `.with()`, this rule only reports known array receivers because other APIs also use these method names.

It does not report mutating methods like `.copyWithin()`, `.fill()`, `.forEach()`, `.pop()`, `.push()`, `.reverse()`, `.shift()`, `.sort()`, `.splice()`, or `.unshift()`. Those are often called for their side effects, so reporting them would be much noisier.

This is a syntax-only rule with a narrow inference boundary. It skips obvious non-arrays such as scalar literals, direct object literals, `String(value)`, and `new Foo()`. It also leaves parameter defaults, destructured bindings, properties, and variables reassigned before the method call unresolved rather than performing broader value-flow analysis. Unknown values with similarly named methods may still be reported.

## Examples

```js
// ❌
array.map(element => transform(element));

// ✅
const transformed = array.map(element => transform(element));
```

```js
// ❌
array.find(element => element.id === targetId);

// ✅
const match = array.find(element => element.id === targetId);
```

```js
// ✅
void array.map(element => transform(element));
```

## Set methods

For known Set receivers, this rule also checks `.union()`, `.intersection()`, `.difference()`, `.symmetricDifference()`, `.isSubsetOf()`, `.isSupersetOf()`, and `.isDisjointFrom()`. The first four return new sets without mutating the receiver; the others return booleans. Mutating `.add()`, `.delete()`, and `.clear()` calls are allowed.

```js
const set = new Set([1, 2]);

// ❌
set.union(other);

// ✅
const combined = set.union(other);
```

## Temporal methods

Temporal values are immutable. This rule checks the following methods on known Temporal receivers:

| Type | Methods |
| --- | --- |
| `Temporal.Instant` | `add`, `subtract` |
| `Temporal.ZonedDateTime` | `add`, `subtract`, `with` |
| `Temporal.PlainDate` | `add`, `subtract`, `with` |
| `Temporal.PlainTime` | `add`, `subtract`, `with` |
| `Temporal.PlainDateTime` | `add`, `subtract`, `with` |
| `Temporal.PlainYearMonth` | `add`, `subtract`, `with` |
| `Temporal.PlainMonthDay` | `with` |
| `Temporal.Duration` | `add`, `subtract`, `with` |

```js
const date = Temporal.PlainDate.from('2026-09-08');

// ❌
date.add({days: 1});

// ✅
const tomorrow = date.add({days: 1});
```

Set and Temporal coverage requires a known receiver: a direct constructor, a Temporal `.from()` call, a simple unchanged variable initializer or alias, or an explicit TypeScript annotation such as `Set<number>` or `Temporal.PlainDate`. Unknown receivers, properties, destructuring, reassigned bindings, constructor aliases, and method-chain inference are intentionally unsupported. Other built-ins, including ordinary `Date` objects, are outside this coverage.

The rule checks directly discarded calls, including optional calls, `await`, TypeScript assertion wrappers, and `for` initializers and updates. It intentionally does not inspect comparison expressions (including Yoda comparisons), logical expressions, conditional expressions, or comma expressions for discarded results.

## Migration

This rule replaces `no-unused-array-method-return`. Replace the old rule name in your configuration; the deprecated name no longer reports problems. The `recommended` and `unopinionated` presets enable the replacement automatically.
