# prefer-default-parameters

📝 Prefer default parameters and destructuring defaults over reassignment and fallback expressions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule prefers default parameters and destructuring defaults over fallback expressions and parameter reassignments, including `||=` and `??=`.

> [!IMPORTANT]
> Defaults only handle `undefined`. The `??` operator also handles `null`, and `||` handles all falsy values. The rule offers suggestions instead of autofixes because this can change behavior. Disable the rule if you need to retain that behavior. We recommend [moving away from `null`](https://github.com/sindresorhus/meta/discussions/7).

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

For fallback expressions:

- Every read must use the same operator (`??` or `||`) and fallback, and the defaulted binding must never be reassigned.
- The fallback must be a literal (excluding regular expressions), an untagged template literal without expressions, or an earlier binding from the same parameter list or destructuring variable declarator. Fallback bindings must never be reassigned. Quoted strings and template literals without expressions are considered the same fallback when their decoded string values are equal.
- Binding order is preserved. Fallbacks referring to later bindings are not reported.
- Plain parameters must be last. Local destructuring declarations must use `const` or `let` and must not be exported.

When the last parameter is only used to initialize a local variable with a fallback, the rule can replace a `const` declaration by renaming that parameter. For `let` and `var`, the rule keeps the local declaration and adds a default to the original parameter instead. TypeScript local declarations and parameter names are retained to preserve their types.

TypeScript annotations are preserved. When full type information is available, suggestions are omitted if the default value is incompatible or depends on type narrowing at a read. Without it, review the default value's type before applying a suggestion. TypeScript setter parameters cannot have initializers, so suggestions only add defaults inside their destructuring patterns.

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
// ❌
function abc(foo) {
	let bar = foo || 'bar';
}

// ✅
function abc(foo = 'bar') {
	let bar = foo;
}
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
// ✅ Fallback bindings must appear earlier in the pattern.
const fn = ({repo, name}) => repo ?? name;
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
