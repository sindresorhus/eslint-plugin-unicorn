# prefer-default-parameters

📝 Prefer default parameters and destructuring defaults over reassignment and fallback expressions.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule prefers default parameters and destructuring defaults over fallback expressions and parameter reassignments, including `||=` and `??=`.

> [!IMPORTANT]
> Defaults only handle `undefined`; `??` also handles `null`, and `||` handles all falsy values. Suggestions can therefore change behavior. Disable the rule if these distinctions matter. We recommend [moving away from `null`](https://github.com/sindresorhus/meta/discussions/7).

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

Fallbacks may be literals, negative number or BigInt literals, untagged template literals without expressions, or earlier bindings in the same parameter list or destructuring pattern. For fallback reads, regular expressions are excluded, every read must use the same operator (`??` or `||`) and fallback, and neither binding may be reassigned. Quoted and template strings are compared by decoded value.

Plain parameters must be last. Local destructuring declarations must use `const` or `let` and must not be exported. Suggestions preserve binding order, names, and local declarations.

TypeScript annotations are preserved. With type information, including JavaScript with JSDoc, the rule skips incompatible type changes, narrowing-dependent defaults, `any` or `unknown` bindings, and `any` fallbacks. Bindings whose type or generic constraint includes `null` are skipped unless the fallback's declaration type is exactly `null`.

Nullability checks require TypeScript's `strictNullChecks` option. Unconstrained generics are checked on a best-effort basis. Without type information, review types before applying suggestions. TypeScript setter parameters are skipped, except destructured bindings.

Code relying on [non-strict `arguments` aliasing](https://eslint.org/docs/latest/rules/no-param-reassign) is unsupported. Parameter defaults break that connection and can change `function.length`.

## Options

### checkFallbackExpressions

Type: `boolean`\
Default: `true`

Set to `false` to allow `||` and `??` fallback reads of parameters and destructured variables. Reassignments remain checked; their suggestions can also change runtime behavior.

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
function abc(foo = 'bar') {
	const bar = foo;
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
