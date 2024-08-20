# Prefer immutable array methods to generate new arrays over modifying original array objects

💼 This rule is enabled in the ✅ `recommended` [config](https://github.com/sindresorhus/eslint-plugin-unicorn#preset-configs-eslintconfigjs).

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Methods like `Array#sort()`, `Array#reverse()`, `Array#splice()`, and direct assignment (`Array#[index]`) modify the original array, potentially causing unexpected behavior. To avoid these issues, prefer using immutable methods like `Array#toSorted()`, `Array#toReversed()`, `Array#toSpliced()`, and `Array#with()` to generate new arrays without altering the original.

## Examples

```js
const newArray = [3,2,1].sort(); // ❌
const newArray = [3,2,1].toSorted(); // ✅

const newArray = new Array({file: 10}).splice(0, 2); // ❌
const newArray = new Array({file: 10}).toSpliced(0, 2); // ✅

const newArray = array.reverse(); // ❌
const newArray = array.toReversed(); // ✅

const newArray = array.splice(start, deleteCount); // ❌
const newArray = array.toSpliced(start, deleteCount); // ✅

array[0] = 'changed'; // ❌
const newArray = array.with(0, 'changed'); // ✅

// When the number of parameters does not match, these methods will be treated as user-defined methods instead of array methods.
// For example, the following are not reported by this rule
array.sort('There', 'is', 'more', 'than', 'one', 'parameter'); // ✅
array.reverse('This should not have parameter'); // ✅
array.splice(0, 1, "This have more then three parameter"); // ✅
```
