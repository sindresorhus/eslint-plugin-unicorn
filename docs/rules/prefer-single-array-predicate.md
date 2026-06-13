# prefer-single-array-predicate

📝 Prefer a single `Array#some()` or `Array#every()` with a combined predicate.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

Combining multiple predicates into a single [`Array#some()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some) or [`Array#every()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every) call is more efficient and readable. Calling the same method multiple times iterates the array multiple times unnecessarily.

This rule only provides suggestions (not autofix) because combining calls can change evaluation order when receivers or predicates have side effects.

## Examples

```js
// ❌ - Iterates array twice
const hasErrors = messages.some(m => m.type === 'error') || messages.some(m => m.severity === 'critical');

// ✅ - Single iteration with combined predicate
const hasErrors = messages.some(m => m.type === 'error' || m.severity === 'critical');
```

```js
// ❌ - Iterates array twice
const allValid = items.every(item => item.valid) && items.every(item => item.complete);

// ✅ - Single iteration
const allValid = items.every(item => item.valid && item.complete);
```

```js
// ❌ - Multiple same-method calls
const hasAnyValue = values.some(v => v !== null) || values.some(v => v !== undefined);

// ✅ - Combine into one check
const hasAnyValue = values.some(v => v !== null && v !== undefined);
```

```js
// ✅ - Different predicates or different methods don't trigger this rule
array.some(x => x > 5) && array.every(x => x < 100); // OK - different methods
array.some(x => x > 5) || someOtherCondition; // OK - different receiver
```
