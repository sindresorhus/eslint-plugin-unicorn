# prefer-type-literal-last

📝 Require type literals to be last in union and intersection types.

💼 This rule is enabled in the following [configs](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config): ✅ `recommended`, ☑️ `unopinionated`.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->
<!-- Do not manually modify this header. Run: `npm run fix:eslint-docs` -->

This rule enforces putting inline object type literals after other members in TypeScript union and intersection types.

Keeping named or otherwise compact types first makes the important top-level type names easier to scan when an inline type literal spans multiple lines.

The rule only moves top-level type literals. It does not sort every type member, and it does not inspect nested type arguments.

Intersection types are reported but not autofixed because changing their order can affect TypeScript overload resolution.

## Examples

```ts
// ❌
type ElementUnion = {
	foo: string;
} | Other;

// ✅
type ElementUnion = Other | {
	foo: string;
};
```

```ts
// ❌
type ElementIntersection = {
	foo: string;
} & Other;

// ✅
type ElementIntersection = Other & {
	foo: string;
};
```

```ts
// ✅
type ElementUnion = Other | {
	foo: string;
};
```
