# no-unused-builtin-method-return

📝 Disallow ignoring the return value of selected built-in methods.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

<!-- end auto-generated rule header -->

Ignoring the result of array methods like `.map()`, Set operations like `.union()`, or Temporal updates like `.add()` is usually a bug or dead code.

If you intentionally want to discard the return value, use `void` to make that explicit.

## Array methods

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

It does not report methods commonly called for side effects, such as `.copyWithin()`, `.fill()`, `.forEach()`, `.pop()`, `.push()`, `.reverse()`, `.shift()`, `.sort()`, `.splice()`, or `.unshift()`.

Array receiver inference has a narrow boundary. It skips obvious non-arrays such as scalar literals, direct object literals, `String(value)`, and `new Foo()`. It also leaves parameter defaults, destructured bindings, properties, and variables reassigned before the method call unresolved rather than performing broader value-flow analysis. Unknown values with similarly named methods may still be reported.

### Examples

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

For known Set receivers, this rule also checks `.has()`, `.union()`, `.intersection()`, `.difference()`, `.symmetricDifference()`, `.isSubsetOf()`, `.isSupersetOf()`, and `.isDisjointFrom()`. The four set operations return new sets without mutating the receiver; the others return booleans. Mutating `.add()`, `.delete()`, and `.clear()` calls are allowed.

```js
const set = new Set([1, 2]);

// ❌
set.union(other);

// ✅
const combined = set.union(other);
```

## Temporal methods

Temporal values are immutable. This rule checks the following methods on known Temporal receivers. A union of Temporal types is checked only when every member supports the method:

| Type | Methods |
| --- | --- |
| `Temporal.Instant` | `add`, `subtract`, `round` |
| `Temporal.ZonedDateTime` | `add`, `subtract`, `with`, `round` |
| `Temporal.PlainDate` | `add`, `subtract`, `with` |
| `Temporal.PlainTime` | `add`, `subtract`, `with`, `round` |
| `Temporal.PlainDateTime` | `add`, `subtract`, `with`, `round` |
| `Temporal.PlainYearMonth` | `add`, `subtract`, `with` |
| `Temporal.PlainMonthDay` | `with` |
| `Temporal.Duration` | `add`, `subtract`, `with`, `round` |

```js
const date = Temporal.PlainDate.from('2026-09-08');

// ❌
date.add({days: 1});

// ✅
const tomorrow = date.add({days: 1});
```

## Supported patterns and limitations

Set and Temporal coverage requires a known receiver: a direct constructor, a Temporal `.from()` call, a simple unchanged variable initializer or alias, or an explicit TypeScript annotation such as `Set<number>` or `Temporal.PlainDate`. Unknown receivers, properties, destructuring, bindings reassigned before the call, constructor aliases, and method-chain inference are intentionally unsupported. Other built-ins, including ordinary `Date` objects, are outside this coverage.

Bindings annotated with a nullable union, along with optional parameters, are left unresolved, including optional calls.

The rule checks directly discarded calls, including optional calls, `await`, TypeScript assertion wrappers, and `for` initializers and updates. It intentionally does not inspect comparison expressions (including Yoda comparisons), logical expressions, conditional expressions, or comma expressions for discarded results.

[`no-unused-iterator-helper`](./no-unused-iterator-helper.md) handles discarded lazy iterator helpers, which require different behavior because `void` does not consume the iterator or run its callback. This rule skips iterator helper calls recognized by that rule.
