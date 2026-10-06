# prefer-default-parameters

📝 Prefer default parameters and destructuring defaults over reassignment and fallback expressions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

Instead of reassigning a function parameter, default parameters should be used. This includes the `||=` and `??=` logical assignment operators. The `foo = foo || 123` statement evaluates to `123` when `foo` is falsy, possibly leading to confusing behavior, whereas default parameters only apply when passed an `undefined` value. This rule reports reassignments to literal values or earlier bindings from the same parameter list. Untagged template literals without expressions are also supported.

The rule also prefers defaults for parameters and destructured variables when every read uses the same operator (`??` or `||`) and fallback, and the variable is never reassigned. The fallback must be a literal (excluding regular expressions), an untagged template literal without expressions, or an earlier binding from the same parameter list or destructuring declaration. Quoted strings and template literals without expressions are considered the same fallback when their decoded string values are equal. Fallback bindings must never be reassigned. Binding order is preserved, so later bindings are not reported. Plain parameters must be last. Local declarations must use `const` or `let` and must not be exported.

> [!NOTE]
> Suggestions can change runtime behavior: `||` and `||=` fall back for all falsy values, `??` and `??=` for `null` or `undefined`, and parameter and destructuring defaults only for `undefined`.

For an empty `versionRange`, the suggestion changes the output:

```js
// Before.
function install(packages) {
	return packages.map(({name, versionRange}) => `${name}@${versionRange || 'latest'}`);
}

console.log(install([{name: 'eslint', versionRange: ''}]));
// ['eslint@latest']
```

```js
// After.
function install(packages) {
	return packages.map(({name, versionRange = 'latest'}) => `${name}@${versionRange}`);
}

console.log(install([{name: 'eslint', versionRange: ''}]));
// ['eslint@']
```

You should disable this rule if you want your functions to deal with `null` and other falsy values the same way as `undefined`. Default parameters are exclusively applied [when `undefined` is received](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters#passing_undefined_vs._other_falsy_values). Destructuring defaults behave the same way, so the rule offers suggestions instead of autofixes. However, we recommend [moving away from `null`](https://github.com/sindresorhus/meta/discussions/7).

## Options

### checkFallbackExpressions

Type: `boolean`\
Default: `true`

Set to `false` to allow `||` and `??` fallback reads of parameters and destructured variables. Reassignments and moving local fallback initializers to parameters remain checked; their suggestions can also change runtime behavior.

```js
export default {
	rules: {
		'unicorn/prefer-default-parameters': [
			'error',
			{
				checkFallbackExpressions: false,
			},
		],
	},
};
```

With `checkFallbackExpressions: false`:

```js
// ✅
const fn = a => a || 3;

// ✅
const fn = ({a}) => a ?? 3;

// ✅
const [a] = arr;
console.log(a || 3);
```

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

```js
// ❌
const fn = (name, repo) => repo ?? name;

// ✅
const fn = (name, repo = name) => repo;
```

```js
// ❌
const fn = ({name, repo}) => repo ?? name;

// ✅
const fn = ({name, repo = name}) => repo;
```

```js
// ❌
const [first, second] = array;
console.log(second ?? first);

// ✅
const [first, second = first] = array;
console.log(second);
```

```js
// ❌
function abc(foo, bar) {
	bar = bar || foo;
}

// ✅
function abc(foo, bar = foo) {}
```
