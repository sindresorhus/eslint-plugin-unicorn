# prefer-default-parameters

📝 Prefer default parameters and destructuring defaults over reassignment and fallback expressions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Instead of reassigning a function parameter, default parameters should be used. This includes the `||=` and `??=` logical assignment operators. The `foo = foo || 123` statement evaluates to `123` when `foo` is falsy, possibly leading to confusing behavior, whereas default parameters only apply when passed an `undefined` value. This rule only reports reassignments to literal values, including untagged template literals without expressions.

The rule also prefers defaults for parameters and destructured variables when every read uses the same operator (`??` or `||`) and literal fallback (excluding regular expressions), and the variable is never reassigned. Quoted strings and template literals without expressions are considered the same fallback when their decoded string values are equal. Plain parameters must be last. Local declarations must use `const` or `let` and must not be exported.

You should disable this rule if you want your functions to deal with `null` and other falsy values the same way as `undefined`. Default parameters are exclusively applied [when `undefined` is received](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters#passing_undefined_vs._other_falsy_values). Destructuring defaults behave the same way, so the rule offers suggestions instead of autofixes. However, we recommend [moving away from `null`](https://github.com/sindresorhus/meta/discussions/7).

Applying a suggestion can change behavior: `??` and `??=` also replace `null`, while `||` and `||=` additionally replace `''`, `false`, `0`, `0n`, and `NaN`. Default parameters and destructuring defaults preserve all of those values.

## Examples

```js
// ❌
const fn = a => a ?? 3;

// ✅
const fn = (a = 3) => a;
```

```js
// ❌
const fn = a => a ?? `foo`;

// ✅
const fn = (a = `foo`) => a;
```

```js
// ❌
const fn = ({a}) => a ?? 3;

// ✅
const fn = ({a = 3}) => a;
```

```js
// ❌
const [a] = arr;
console.log(a ?? 3);

// ✅
const [a = 3] = arr;
console.log(a);
```

```js
// ❌
function abc(foo) {
	foo = foo || 'bar';
}

// ✅
function abc(foo = 'bar') {}
```

```js
// ❌
function abc(foo) {
	const bar = foo || 'bar';
}

// ✅
function abc(bar = 'bar') {}
```

```js
// ✅
function abc(foo) {
	foo = foo || bar();
}
```
