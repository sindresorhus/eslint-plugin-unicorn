# no-unused-array-method-return

📝 Disallow ignoring the return value of selected array methods.

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

It does not report mutating methods like `.copyWithin()`, `.fill()`, `.forEach()`, `.pop()`, `.push()`, `.reverse()`, `.shift()`, `.sort()`, `.splice()`, or `.unshift()`. Those are often called for their side effects, so reporting them would be much noisier.

This is a syntax-only rule with a narrow inference boundary. It skips some obvious non-arrays such as literals, direct object literals, `String(value)`, `new Foo()`, parameter defaults, and simple declaration-based destructuring, but it intentionally does not reason about object spreads, string destructuring, `for…of` bindings, or other broader value-flow patterns. Unknown values with similarly named methods may still be reported.

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
