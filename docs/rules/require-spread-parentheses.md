# require-spread-parentheses

📝 Require parentheses around complex spread arguments.

🚫 Disabled by default.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

`...enabled && overrides` spreads the result of `enabled && overrides`. Parentheses make this grouping clear.

This rule checks the outermost expression in object and array spreads, function and constructor arguments, and JSX spread attributes. It covers binary, logical, conditional, assignment, and comma expressions, as well as TypeScript type assertions and `satisfies` expressions.

With `vue-eslint-parser`, it also checks JavaScript spreads inside Vue template expressions.

It also checks `await` and `yield` in object and array spreads and in function and constructor arguments. JSX spread attributes can use these two expressions without parentheses, which is how Prettier and Oxfmt format them.

## Examples

```js
// ❌
const options = {...enabled && overrides};

// ✅
const options = {...(enabled && overrides)};
```

```js
// ❌
const values = [first, ...useDefaults ? defaults : customValues];

// ✅
const values = [first, ...(useDefaults ? defaults : customValues)];
```

```js
// ❌
const letters = [...prefix + suffix];

// ✅
const letters = [...(prefix + suffix)];
```

```js
// ❌
fn(...args ??= fallback);

// ✅
fn(...(args ??= fallback));
```

```ts
// ❌
fn(...source as string[]);

// ✅
fn(...(source as string[]));
```

```js
// ❌
const items = [...await loadItems()];

// ✅
const items = [...(await loadItems())];
```

```tsx
// ❌
<Component {...record(), props} />;

// ✅
<Component {...(record(), props)} />;
```

## Compatibility

If you use [`@stylistic/no-extra-parens`](https://eslint.style/rules/no-extra-parens), configure its `ignoredNodes` option to allow parentheses in these positions:

```js
const rules = {
	'@stylistic/no-extra-parens': ['error', 'all', {
		ignoredNodes: [
			':matches(SpreadElement, JSXSpreadAttribute)[argument.type=/^(?:(?:Assignment|Binary|Conditional|Logical|Sequence|TSAs|TSSatisfies)Expression|TSTypeAssertion)$/]',
			'SpreadElement[argument.type=/^(?:Await|Yield)Expression$/]',
		],
	}],
};
```

ESLint's core [`no-extra-parens`](https://eslint.org/docs/latest/rules/no-extra-parens) has no `ignoredNodes` option. Disable it where you enable this rule.

For Vue templates, use the same options with [`vue/no-extra-parens`](https://eslint.vuejs.org/rules/no-extra-parens.html) when it extends ESLint Stylistic. If it uses ESLint's core rule, disable `vue/no-extra-parens` for those files.
